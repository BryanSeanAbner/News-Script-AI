# PIPELINE_RULES.md — NewsScript AI

> **STATUS: BINDING CONTRACT**
> Dokumen ini adalah aturan wajib yang HARUS diikuti oleh semua developer, AI assistant, dan sistem otomatis.
> Perubahan pada dokumen ini memerlukan review dari lead editor DAN tech lead.

---

## 📋 Daftar Aturan

1. [AI Provider Assignment Rules](#1-ai-provider-assignment-rules)
2. [Step Input/Output Contracts](#2-step-inputoutput-contracts)
3. [Human Gate Rules](#3-human-gate-rules)
4. [Grounding Constraint Rules](#4-grounding-constraint-rules)
5. [Revision Loop Rules](#5-revision-loop-rules)
6. [Error & Fallback Rules](#6-error--fallback-rules)
7. [Data Integrity Rules](#7-data-integrity-rules)
8. [Prompt Engineering Rules](#8-prompt-engineering-rules)

---

## 1. AI Provider Assignment Rules

### 🔴 ATURAN ABSOLUT — TIDAK BOLEH DILANGGAR

```
┌─────────────────────────────────────────────────────────┐
│  PROVIDER ASSIGNMENT TABLE                              │
├──────┬─────────────────────────────┬────────────────────┤
│ Step │ Nama                        │ Provider           │
├──────┼─────────────────────────────┼────────────────────┤
│  1   │ Editor Input Artikel        │ HUMAN — Bukan AI   │
│  2   │ Fact Extraction             │ GEMINI FLASH ONLY  │
│  3   │ Gap Analysis                │ GEMINI FLASH ONLY  │
│  4   │ Angle Mapping               │ GEMINI FLASH ONLY  │
│  5   │ Editor Pilih Angle          │ HUMAN — Bukan AI   │
│  6   │ Title Generation            │ GEMINI FLASH ONLY  │
│  7   │ Draft Generation            │ GROK-3 ONLY        │
│  8   │ Evidence/Grounding Check    │ GEMINI FLASH ONLY  │
│  9   │ Human Editorial Review      │ HUMAN — Bukan AI   │
│ 10   │ Publish                     │ HUMAN — Bukan AI   │
└──────┴─────────────────────────────┴────────────────────┘
```

**ALASAN:**
- Gemini Flash = cost-efficient, fast → cocok untuk structured extraction & analysis
- Grok-3 = creative, high-quality long-form → khusus draft generation
- Model boleh berubah versi (via env var) tapi **provider tidak boleh ditukar**

**ENFORCEMENT:**
```python
# Di step_runner.py, WAJIB ada guard ini:
STEP_PROVIDER_MAP = {
    2: "gemini", 3: "gemini", 4: "gemini",
    6: "gemini", 7: "grok", 8: "gemini"
}

def get_adapter_for_step(step: int) -> BaseAIAdapter:
    provider = STEP_PROVIDER_MAP.get(step)
    if provider == "grok" and step != 7:
        raise RuntimeError(f"VIOLATION: Grok digunakan pada Step {step}, hanya boleh Step 7")
    ...
```

---

## 2. Step Input/Output Contracts

### Step 1 — Editor Input Artikel `[HUMAN GATE]`

- **Input**: Editor mengisi form secara manual
- **Required fields**: `title`, `body` (min 100 karakter), `sources` (min 1 URL)
- **Output**: Sesuai `schema/article_input.json`
- **Constraint**: Artikel tidak boleh kosong. Sistem tidak boleh auto-generate teks di step ini.
- **Next**: Setelah submit → otomatis trigger Step 2

---

### Step 2 — Fact Extraction (Gemini Flash)

- **Input**: `article_input.body` + `article_input.title`
- **Output**: Sesuai `schema/fact_extraction.json`
- **Required output**: Minimal 3 fakta, setiap fakta harus punya `id`, `claim`, `category`
- **Constraint**: Fakta hanya boleh berasal dari teks artikel. DILARANG tambah fakta dari pengetahuan umum LLM.
- **Prompt instruction wajib**: *"Extract only facts explicitly stated in the provided article text. Do not add any information from your general knowledge."*
- **Validation**: Output JSON HARUS valid terhadap `schema/fact_extraction.json`
- **On failure**: Retry max `GEMINI_MAX_RETRY` kali, lalu return error ke Step 1

---

### Step 3 — Gap Analysis (Gemini Flash)

- **Input**: `fact_extraction.facts` + `article_input.body`
- **Output**: Sesuai `schema/gap_analysis.json`
- **Required output**: Minimal 3 gap, `top_gaps` berisi tepat 3 gap ID
- **Constraint**: Gap harus benar-benar *tidak dibahas* dalam artikel. Gap yang sudah ada jawabannya di artikel = invalid.
- **Ranking rule**: `top_gaps` diurutkan berdasarkan kombinasi `relevance_score` + editorial importance
- **Validation**: Output JSON HARUS valid terhadap `schema/gap_analysis.json`

---

### Step 4 — Angle Mapping (Gemini Flash, BATCH)

- **Input**: `gap_analysis.top_gaps` (3 gap ID) + data gap detail + semua fakta
- **Output**: Sesuai `schema/angle_mapping.json` — tepat **3 angle** dalam **1 LLM call**
- **BATCH RULE**: Step 4 WAJIB menghasilkan 3 angle dalam 1 kali pemanggilan API, bukan 3 kali panggil terpisah
- **Constraint**: Setiap angle HARUS memiliki `supporting_fact_ids` yang valid (harus ada di `fact_extraction.facts`)
- **Validation**: Output array `angles` harus memiliki panjang tepat 3

---

### Step 5 — Editor Pilih Angle `[HUMAN GATE]`

- **Input**: 3 angle dari `angle_mapping.angles`
- **Action**: Editor memilih tepat 1 angle
- **Output**: `{ "selected_angle_id": "angle_XXX", "selected_at": "..." }`
- **Constraint**: Sistem tidak boleh auto-select angle. Harus ada interaksi manusia.
- **Timeout**: Tidak ada timeout — tunggu sampai editor memilih
- **Next**: Pilihan disimpan, otomatis trigger Step 6

---

### Step 6 — Title Generation (Gemini Flash)

- **Input**: Angle terpilih + `article_input.metadata.topic` + fakta kunci
- **Output**: Sesuai `schema/title_options.json` — minimal 3 opsi judul
- **SEO constraint**: Setiap judul max 120 karakter, harus mengandung minimal 1 keyword utama
- **Style diversity**: Opsi judul harus beragam style (question, statement, how_to, dll)
- **Editor selection**: Editor BISA pilih salah satu ATAU edit manual (custom title diperbolehkan)

---

### Step 7 — Draft Generation (Grok-3) ⚠️

- **Input**: Angle terpilih + judul terpilih + **SEMUA facts dari Step 2**
- **Output**: Sesuai `schema/draft.json`
- **GROUNDING CONSTRAINT**: Prompt WAJIB menyertakan:
  ```
  "You MUST only make claims that are directly supported by the provided facts list.
   Do NOT add information from your general knowledge.
   Every factual claim MUST reference at least one fact from the provided facts."
  ```
- **Output requirement**: Draft harus menyertakan `grounding_constraint.fact_ids_used`
- **Revision context**: Jika `LOOP_SMALL`, sertakan `editor_notes` dari Step 9 dalam prompt
- **Model**: HANYA `grok-3` atau model yang dikonfigurasi di `GROK_MODEL` env

---

### Step 8 — Evidence/Grounding Check (Gemini Flash)

- **Input**: `draft.content` + `fact_extraction.facts`
- **Output**: Sesuai `schema/grounding_result.json`
- **Scoring**:
  ```
  grounding_score = jumlah_klaim_grounded / total_klaim_dalam_draft
  ```
- **Decision logic**:
  ```
  score >= 0.85 (GROUNDING_THRESHOLD_PASS) → status = "PASS" → lanjut ke Step 9
  score >= 0.70 (GROUNDING_THRESHOLD_WARN) → status = "WARN" → lanjut ke Step 9 + tampilkan warning
  score <  0.70 (GROUNDING_THRESHOLD_WARN) → status = "FAIL" → otomatis LOOP_SMALL
  ```
- **ATURAN**: Step 8 TIDAK BOLEH di-skip. Bahkan jika skor tinggi, tetap harus dicatat.

---

### Step 9 — Human Editorial Review `[HUMAN GATE]`

- **Input**: Draft final + grounding report + semua data pipeline
- **Actions yang tersedia**:
  1. **APPROVE** → lanjut ke Step 10
  2. **REVISION MINOR** (LOOP_SMALL) → kembali ke Step 7 dengan catatan
  3. **REVISION MAJOR** (LOOP_LARGE) → kembali ke Step 4 dengan catatan
- **Editor responsibility**: Akurasi faktual, etika jurnalistik, aspek hukum (SARA, privasi, dll)
- **Catatan wajib**: Jika memilih revision, `editor_notes` WAJIB diisi (tidak boleh kosong)

---

### Step 10 — Publish

- **Input**: Artikel yang sudah di-approve di Step 9
- **Output**: Sesuai `schema/publish_output.json`
- **Actions**: Simpan ke `data/published/`, generate slug, hitung pipeline_summary
- **Immutable**: Setelah publish, data di `data/published/` tidak boleh diedit melalui pipeline

---

## 3. Human Gate Rules

```
Human gates ada di Step 1, 5, dan 9.
Pipeline TIDAK BOLEH melanjutkan tanpa konfirmasi manusia di gate ini.
```

| Step | Gate | Timeout | Auto-proceed? |
|------|------|---------|---------------|
| 1 | Submit artikel | Tidak ada | ❌ Tidak |
| 5 | Pilih angle | Tidak ada | ❌ Tidak |
| 9 | Approve/Revisi | Tidak ada | ❌ Tidak |

**DILARANG** membuat fitur "auto-approve" meskipun untuk keperluan testing.
Untuk testing, gunakan mock data, bukan auto-approve di production code.

---

## 4. Grounding Constraint Rules

Ini adalah **aturan paling kritis** di seluruh sistem.

### 4.1 Definisi Grounded Claim

Sebuah klaim dalam draft dianggap **grounded** jika:
1. Klaim tersebut secara eksplisit atau implisit didukung oleh minimal 1 fakta dari `fact_extraction.facts`
2. Tidak ada informasi tambahan yang tidak ada di facts (generalisasi berlebihan = ungrounded)

### 4.2 Ungrounded Claim Handling

```
Severity CRITICAL → klaim yang secara langsung salah/bertentangan dengan facts
Severity MAJOR    → klaim yang tidak ada dukungan faktanya sama sekali
Severity MINOR    → klaim yang generalisasi atau interpretasi ringan dari facts
```

### 4.3 Threshold Configuration

```bash
# Dari .env — JANGAN hardcode di code
GROUNDING_THRESHOLD_PASS=0.85   # PASS: lanjut normal
GROUNDING_THRESHOLD_WARN=0.70   # WARN: lanjut dengan peringatan merah di UI
                                 # FAIL (< WARN): otomatis LOOP_SMALL
```

### 4.4 Grounding Check WAJIB Ulang Setelah Revisi

Setiap kali LOOP_SMALL menghasilkan draft baru, Step 8 HARUS dijalankan ulang.
DILARANG meneruskan draft revisi ke Step 9 tanpa melewati Step 8 terlebih dahulu.

---

## 5. Revision Loop Rules

### 5.1 LOOP_SMALL (Step 9 → Step 7)

**Kapan digunakan:**
- Tone tidak tepat tapi fakta benar
- Struktur kurang baik
- Beberapa kalimat perlu diperhalus
- Grounding score FAIL (otomatis, bukan pilihan editor)

**Yang di-clear:**
- `session.data.step_7` (draft)
- `session.data.step_8` (grounding result)

**Yang dipertahankan:**
- Angle (step_5)
- Judul (step_6.selected_title)
- Semua facts (step_2)

**Maksimum loop:**
- Tidak ada batas teknis, tapi sistem harus menampilkan counter ke editor
- Best practice: lebih dari 3x LOOP_SMALL → sarankan LOOP_LARGE

### 5.2 LOOP_LARGE (Step 9 → Step 4)

**Kapan digunakan:**
- Angle yang dipilih salah arah
- Sudut berita tidak sesuai nilai editorial
- Harus mulai dari perspektif baru

**Yang di-clear:**
- `session.data.step_4` (angle mapping)
- `session.data.step_5` (selected angle)
- `session.data.step_6` (titles)
- `session.data.step_7` (draft)
- `session.data.step_8` (grounding result)
- `session.data.step_9` (review)

**Yang dipertahankan:**
- Artikel input (step_1)
- Facts (step_2)
- Gaps (step_3) — gap analysis tidak perlu ulang

**Catatan**: Step 3 (gap analysis) TIDAK perlu diulang saat LOOP_LARGE karena artikel referensi tidak berubah.

---

## 6. Error & Fallback Rules

### 6.1 AI API Errors

```
HTTP 429 (Rate Limit):
  → Tunggu {RETRY_DELAY_BASE * 2^attempt} detik
  → Retry sampai max retry tercapai
  → Jika tetap gagal: tampilkan error ke UI, step tidak advance

HTTP 500/503 (Server Error):
  → Retry dengan exponential backoff
  → Jika tetap gagal: tampilkan error, izinkan manual retry dari UI

HTTP 401/403 (Auth Error):
  → FATAL: Jangan retry
  → Tampilkan pesan "API key tidak valid, periksa konfigurasi"
  → Log ke error_log
```

### 6.2 LLM Output Validation Errors

```
JSON Parse Error:
  → Retry dengan prompt yang diperkuat: "Respond ONLY with valid JSON. No markdown, no explanation."
  → Jika tetap gagal setelah max retry: return error ke UI

Schema Validation Error:
  → Retry dengan prompt yang diperkuat, sertakan contoh JSON yang benar
  → Jika tetap gagal: return error, simpan raw response untuk debugging
```

### 6.3 Session State Errors

```
Jika session tidak ditemukan:  → 404 error, redirect ke /sessions

Jika step dipanggil out of order: → 400 error dengan pesan jelas
  Contoh: "Tidak bisa jalankan Step 7 — Step 5 belum selesai"
```

---

## 7. Data Integrity Rules

1. **Immutability per step**: Setelah step selesai dan data tersimpan, data step tersebut tidak boleh dioverwrite kecuali oleh revision loop yang valid.
2. **Atomic saves**: Setiap update session harus atomic (write ke temp file, lalu rename).
3. **Audit trail**: `session.error_log` harus mencatat semua error, revision loop, dan retry.
4. **No secret in session**: API keys, tokens, dan informasi sensitif TIDAK BOLEH tersimpan di session file.

---

## 8. Prompt Engineering Rules

1. **System prompt wajib** untuk setiap LLM call — jangan kirim user message saja.
2. **JSON-only instruction**: Setiap prompt untuk structured output HARUS berisi:
   ```
   "Respond with ONLY valid JSON. Do not include markdown code blocks, 
    explanations, or any text outside the JSON object."
   ```
3. **Grounding instruction wajib di Step 7**:
   ```
   "Base all factual claims EXCLUSIVELY on the provided facts list. 
    Do not use information from your training data."
   ```
4. **Language instruction**: Semua prompt HARUS menyertakan:
   ```
   "Write the output in Indonesian (Bahasa Indonesia)."
   ```
5. **Max token limit**: Setiap step harus mendefinisikan max_tokens yang sesuai, hindari unlimited generation.
