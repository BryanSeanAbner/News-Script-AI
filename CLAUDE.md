# CLAUDE.md — NewsScript AI

> Panduan konteks untuk AI coding assistant (Claude, Gemini, Copilot, dll).
> Baca file ini **pertama kali** sebelum menyentuh kode apapun di repository ini.

---

## 📌 Project Overview

**NewsScript AI** adalah platform jurnalisme berbantuan AI yang mengotomatisasi proses pembuatan berita dari referensi artikel yang ada. Pipeline terdiri dari **10 langkah** yang menggabungkan tiga titik keputusan manusia (_human gates_) dengan beberapa LLM call yang terstruktur.

**Tujuan utama:**

- Membantu editor menemukan sudut pandang (angle) berita yang belum dibahas
- Menghasilkan draft artikel yang _grounded_ (semua klaim bersumber dari fakta terverifikasi)
- Menjaga kontrol editorial tetap di tangan manusia pada gate-gate kritikal

---

## 🗂️ Struktur Direktori

```
news-script-ai/
├── CLAUDE.md                  ← File ini
├── ARCHITECTURE.md            ← Arsitektur sistem lengkap
├── PIPELINE_RULES.md          ← Aturan wajib pipeline
├── Design.md                  ← Spesifikasi desain React
├── .env.example               ← Template environment variables
│
├── schema/                    ← JSON Schema per pipeline step
│   ├── article_input.json     ← Step 1 input
│   ├── fact_extraction.json   ← Step 2 output
│   ├── gap_analysis.json      ← Step 3 output
│   ├── angle_mapping.json     ← Step 4 output
│   ├── title_options.json     ← Step 6 output
│   ├── draft.json             ← Step 7 output
│   ├── grounding_result.json  ← Step 8 output
│   ├── session.json           ← Full session state
│   └── publish_output.json    ← Step 10 output
│
├── frontend/                  ← React app (Vite)
│   ├── src/
│   │   ├── components/        ← Reusable UI components
│   │   ├── pages/             ← Halaman per pipeline step
│   │   ├── stores/            ← Zustand state stores
│   │   ├── hooks/             ← Custom React hooks
│   │   ├── services/          ← API call functions
│   │   ├── styles/            ← CSS files (GitHub Light)
│   │   └── utils/             ← Helper functions
│   └── public/
│
└── backend/                   ← Python FastAPI
    ├── main.py                ← FastAPI app entry point
    ├── pipeline/              ← Pipeline orchestrator & step runners
    ├── adapters/              ← AI provider adapters (Gemini, Grok)
    ├── schemas/               ← Pydantic models
    ├── routers/               ← FastAPI route handlers
    ├── data/
    │   ├── sessions/          ← JSON session files
    │   └── published/         ← Artikel yang sudah dipublish
    └── utils/                 ← Helper functions backend
```

---

## 🔄 Pipeline Steps

| Step | Nama                   | Type               | AI Provider      |
| ---- | ---------------------- | ------------------ | ---------------- |
| 1    | Editor Input Artikel   | Human Gate         | —                |
| 2    | Fact Extraction        | LLM (murah)        | **Gemini Flash** |
| 3    | Gap Analysis           | LLM (murah)        | **Gemini Flash** |
| 4    | Angle Mapping          | LLM (murah, batch) | **Gemini Flash** |
| 5    | Editor Pilih Angle     | Human Gate         | —                |
| 6    | Title Generation       | LLM (murah)        | **Gemini Flash** |
| 7    | Draft Generation       | LLM (mahal)        | **Grok-3**       |
| 8    | Evidence/Grounding Chk | LLM (murah)        | **Gemini Flash** |
| 9    | Human Editorial Review | Human Gate         | —                |
| 10   | Publish                | Output             | —                |

**Revision Loops:**

- `LOOP_SMALL` : Step 9 → Step 7 (revisi draft, angle tetap)
- `LOOP_LARGE` : Step 9 → Step 4 (ganti angle, mulai ulang dari mapping)

---

## ⚙️ Tech Stack

### Frontend

- **Framework**: React 18 + Vite
- **Routing**: React Router v6
- **State**: Zustand
- **Styling**: Vanilla CSS (GitHub Light Design System)
- **HTTP Client**: Fetch API (native)

### Backend

- **Framework**: Python FastAPI
- **AI — Step 2,3,4,6,8**: `google-generativeai` SDK → Gemini Flash models
- **AI — Step 7 ONLY**: OpenAI-compatible client → xAI Grok API
- **Validation**: Pydantic v2
- **Config**: python-dotenv
- **Storage**: File-based JSON (`data/sessions/`, `data/published/`)

---

## 📏 Coding Conventions

### Bahasa

- **Komentar bisnis logic** : Bahasa Indonesia (agar editor non-teknis bisa baca)
- **Komentar teknis / code** : Bahasa Inggris
- **Nama variabel & fungsi** : Bahasa Inggris (snake_case backend, camelCase frontend)
- **Nama file** : kebab-case di frontend, snake_case di backend

### Frontend (React)

```javascript
// ✅ BENAR — functional component, named export
export function ArticleInputPage() { ... }

// ✅ BENAR — custom hook untuk API call
function useFactExtraction(sessionId) { ... }

// ❌ SALAH — jangan pakai class component
class ArticleInputPage extends React.Component { ... }
```

### Backend (Python)

```python
# ✅ BENAR — async function untuk semua AI calls
async def run_fact_extraction(article_text: str) -> FactExtractionResult:
    ...

# ✅ BENAR — Pydantic model untuk semua data exchange
class FactExtractionResult(BaseModel):
    facts: list[Fact]
    extracted_at: datetime

# ❌ SALAH — jangan return dict mentah, selalu pakai Pydantic
async def run_fact_extraction(article_text: str) -> dict:
    ...
```

### AI Provider Rules (KRITIS)

```
Gemini → Step 2, 3, 4, 6, 8 SAJA
Grok   → Step 7 SAJA

DILARANG menukar assignment ini tanpa mengubah PIPELINE_RULES.md terlebih dahulu.
```

---

## 🚦 DO / DON'T List

### ✅ DO

- Selalu validasi output JSON dari LLM menggunakan schema di `schema/`
- Selalu gunakan retry dengan exponential backoff untuk semua AI calls
- Selalu simpan state session setelah setiap step selesai
- Gunakan Pydantic models untuk semua data yang melewati API boundary
- Beri label `[HUMAN GATE]` di komentar untuk setiap step yang butuh manusia
- Grounding check (Step 8) WAJIB lulus sebelum draft bisa masuk Step 9

### ❌ DON'T

- Jangan simpan API key di frontend atau commit ke git
- Jangan skip Step 8 (Grounding Check) meskipun dalam mode development
- Jangan gunakan Grok untuk step selain Step 7
- Jangan hardcode model name — selalu baca dari environment variable
- Jangan gabungkan multiple step dalam satu LLM call (kecuali Step 4 batch)
- Jangan generate klaim di draft yang tidak ada di `fact_extraction.json`

---

## 🔑 Environment Variables

Lihat `.env.example` untuk daftar lengkap. Variables paling penting:

```bash
GEMINI_API_KEY=              # Google Gemini API key
GROK_API_KEY=                # xAI Grok API key
GEMINI_MODEL=                # Default: gemini-2.0-flash
GROK_MODEL=                  # Default: grok-3
GROUNDING_THRESHOLD_PASS=    # Default: 0.85 — min score lanjut ke Step 9
```

---

## 📚 Referensi Dokumen

| Dokumen                              | Tujuan                      |
| ------------------------------------ | --------------------------- |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Arsitektur teknis detail     |
| [PIPELINE_RULES.md](./PIPELINE_RULES.md) | Aturan wajib setiap step |
| [Design.md](./Design.md)             | Spesifikasi UI/UX React     |
| [schema/session.json](./schema/session.json) | Master schema session |
| [.env.example](./.env.example)       | Template konfigurasi        |
