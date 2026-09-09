"""
Serverless Function: Quick News Generator (Kutipan/Wawancara Narsum -> Berita 5W+1H SEO 2026)
Endpoint: /api/quick-news
"""

import json
import os
import re
import sys
from http.server import BaseHTTPRequestHandler
from typing import Dict, List, Any

# Add path untuk import modules (Vercel serverless)
sys.path.insert(0, '/var/task')

# Multi-provider adapter
try:
    from groq import Groq
except ImportError:
    Groq = None

try:
    import google.generativeai as genai
except ImportError:
    genai = None

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None


class AIProvider:
    """Multi-provider AI adapter untuk Groq → Gemini → OpenRouter fallback (TETAP DIPERTAHANKAN)"""
    
    def __init__(self):
        self.groq_key = os.getenv('GROK_API_KEY', '')
        self.gemini_key = os.getenv('GEMINI_API_KEY', '')
        self.openrouter_key = os.getenv('OPENROUTER_API_KEY', '')
    
    def generate(self, prompt: str, max_tokens: int = 4096) -> str:
        """Generate text menggunakan multi-provider fallback"""
        
        # Try Groq first
        if self.groq_key and Groq:
            try:
                client = Groq(api_key=self.groq_key)
                response = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=min(max_tokens, 8000),
                    temperature=0.3
                )
                return response.choices[0].message.content
            except Exception as e:
                print(f"Groq failed: {e}")
        
        # Fallback ke Gemini
        if self.gemini_key and genai:
            try:
                genai.configure(api_key=self.gemini_key)
                model = genai.GenerativeModel("gemini-2.0-flash-exp")
                response = model.generate_content(prompt)
                return response.text
            except Exception as e:
                print(f"Gemini failed: {e}")
        
        # Fallback ke OpenRouter
        if self.openrouter_key and OpenAI:
            try:
                client = OpenAI(
                    api_key=self.openrouter_key,
                    base_url="https://openrouter.ai/api/v1",
                )
                response = client.chat.completions.create(
                    model="meta-llama/llama-3.3-70b-instruct",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=min(max_tokens, 4096),
                )
                return response.choices[0].message.content
            except Exception as e:
                print(f"OpenRouter failed: {e}")
        
        raise Exception("Semua AI providers gagal. Pastikan setidaknya satu API key tersedia.")


def extract_json(text: str) -> str:
    """Extract JSON dari response yang mungkin berisi markdown"""
    text = text.strip()
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0]
    elif "```" in text:
        text = text.split("```")[1].split("```")[0]
    return text.strip()


def analyze_interview_narsum(raw_text: str, speaker_name: str = "", speaker_title: str = "", topic: str = "", title: str = "") -> Dict[str, Any]:
    """
    Slide 1 -> Slide 2:
    Analisis kutipan/wawancara narsum menjadi 5W+1H, intisari kutipan, sudut pandang (angle),
    serta rekomendasi 3 judul SEO ber-keyword kuat (Google News 2026).
    """
    provider = AIProvider()
    
    user_title_context = f"\n- Ide / Judul Awal Pengguna: {title}" if title else ""
    prompt = f"""Kamu adalah editor konten senior dan analis teks berpengalaman, spesialis SEO 2026.
Kamu mampu menganalisis semua jenis bahan teks: kutipan wawancara, siaran pers, laporan riset, pidato, notulensi, atau pernyataan resmi.

INFORMASI SUMBER:
- Topik/Kategori: {topic or "Umum"}{user_title_context}
{f"- Nama Narsum/Penulis (jika ada): {speaker_name}" if speaker_name else "- Nama Tokoh/Penulis: Otomatis ekstrak dari teks"}
{f"- Jabatan/Institusi (jika ada): {speaker_title}" if speaker_title else "- Jabatan/Institusi: Otomatis ekstrak dari teks"}

TEKS WAWANCARA / PERNYATAAN / KUTIPAN NARSUM:
\"\"\"
{raw_text}
\"\"\"

TUGAS KAMU:
1. Bedah teks menjadi formula 5W+1H yang padat, akurat, dan faktual:
   - What (Peristiwa apa yang terjadi/dibahas)
   - Who (Siapa tokoh/pelaku/korban/pejabat/narsum terkait — sebutkan nama dan jabatan/institusinya secara lengkap yang teridentifikasi dari teks)
   - Where (Di mana lokasi peristiwa/pernyataan)
   - When (Kapan waktu peristiwa/pernyataan)
   - Why (Mengapa peristiwa terjadi / motif / alasan)
   - How (Bagaimana kronologi kejadian / bagaimana respon tindakan pihak berwenang)
2. Ekstrak minimal 2 kutipan langsung (quotes) paling berbobot dari narasumber beserta nama tokoh pembicaranya.
3. Rancang 3 opsi Judul Berita SEO Google 2026:
   - Panjang 40-65 karakter
   - Diawali kata kunci utama (Keyword-Frontloaded)
   - Mengandung nama narsum/jabatan atau subjek peristiwa
   - Menghindari clickbait murahan tapi membuat penasaran (High CTR)
   {f"- Pertimbangkan ide judul awal dari pengguna: '{title}' dan kembangkan menjadi versi judul SEO ber-CTR tinggi" if title else ""}
4. Buat 2-3 Angle / Sudut Pandang berita yang bisa dipilih editor.

PENTING: Berikan output HANYA format JSON valid tanpa markdown codeblock:
{{
  "five_w_one_h": {{
    "what": "...",
    "who": "...",
    "where": "...",
    "when": "...",
    "why": "...",
    "how": "..."
  }},
  "quotes": [
    {{
      "speaker": "...",
      "quote": "Kutipan langsung verbatim..."
    }}
  ],
  "titles": [
    {{
      "id": 1,
      "text": "Judul SEO 1...",
      "keyword": "Kata kunci utama",
      "style": "To the point / Breaking News"
    }},
    {{
      "id": 2,
      "text": "Judul SEO 2...",
      "keyword": "Kata kunci utama",
      "style": "Kronologi & Dampak"
    }},
    {{
      "id": 3,
      "text": "Judul SEO 3...",
      "keyword": "Kata kunci utama",
      "style": "Pernyataan Pejabat / Sanksi"
    }}
  ],
  "angles": [
    {{
      "id": 1,
      "title": "Fokus Kronologi & Peristiwa",
      "hook": "Menyoroti detik-detik peristiwa dan fakta di lapangan"
    }},
    {{
      "id": 2,
      "title": "Fokus Tanggapan Resmi & Penegakan Hukum",
      "hook": "Menyoroti pernyataan tegas pejabat serta sanksi/aturan hukum"
    }}
  ]
}}"""

    result_text = provider.generate(prompt, max_tokens=3000)
    data = json.loads(extract_json(result_text))
    return data


def generate_seo_news_draft(
    raw_text: str,
    selected_title: str,
    selected_angle: str = "",
    five_w_one_h: Dict = None,
    quotes: List[Dict] = None,
    speaker_name: str = "",
    speaker_title: str = "",
    topic: str = ""
) -> Dict[str, Any]:
    """
    Slide 2 -> Slide 3:
    Generate naskah berita 5W+1H berformula SEO Google 2026:
    - Target: 350-500 kata (Ideal ±400 kata)
    - Lead 5W1H (40-50 kata, Paragraf 1)
    - H2 #1: Kronologi (100-120 kata) + Kutipan narsum #1
    - H2 #2: Konteks & Bukti (100-120 kata)
    - H2 #3: Tanggapan Pejabat/Narsum & Tindak Lanjut/Sanksi (80-100 kata) + Kutipan narsum #2
    - Penutup: Dasar hukum/update terkini (±30 kata)
    - Kaidah Mobile: Maksimal 3 kalimat per paragraf!
    - Label [FACT/CONTEXT/OPINI] per paragraf.
    """
    provider = AIProvider()
    
    if not speaker_name:
        if quotes and len(quotes) > 0 and quotes[0].get('speaker'):
            speaker_name = quotes[0].get('speaker')
        elif five_w_one_h and five_w_one_h.get('who'):
            speaker_name = five_w_one_h.get('who')
        else:
            speaker_name = "Narasumber / Tokoh Terkait"

    speaker_display = f"{speaker_name} ({speaker_title})" if speaker_title else speaker_name

    five_w_text = ""
    if five_w_one_h:
        five_w_text = f"""
Fakta 5W+1H:
- What: {five_w_one_h.get('what', '')}
- Who: {five_w_one_h.get('who', '')}
- Where: {five_w_one_h.get('where', '')}
- When: {five_w_one_h.get('when', '')}
- Why: {five_w_one_h.get('why', '')}
- How: {five_w_one_h.get('how', '')}
"""

    quotes_text = ""
    if quotes:
        quotes_text = "\n".join([f"- \"{q.get('quote', '')}\" ({q.get('speaker', speaker_name)})" for q in quotes])

    prompt = f"""Kamu adalah penulis konten senior dan analis teks berpengalaman.
Kamu mampu menulis berbagai jenis naskah terstruktur: berita harian, artikel kebijakan, laporan investigasi, analisis bisnis, ringkasan riset, atau opini editorial.
Kamu menerapkan formula SEO Google 2026: 5W+1H, H2 terstruktur, kutipan kuat, dan analisis mendalam.

JUDUL: {selected_title}
SUDUT PANDANG: {selected_angle or "Analisis Kebijakan & Tanggapan Resmi"}
NARASUMBER / PENULIS: {speaker_display}
TOPIK: {topic or "Umum"}

{five_w_text}

KUTIPAN ASLI NARASUMBER:
{quotes_text if quotes_text else raw_text}

BAHAN MENTAH:
\"\"\"
{raw_text}
\"\"\"

═══════════════════════════════════════════════════════════════
ATURAN WAJIB — TIDAK BOLEH DILANGGAR:
═══════════════════════════════════════════════════════════════

A) FIELD "text" DI SETIAP PARAGRAF HARUS BERUPA KALIMAT BERITA PROSA BIASA:
   - DILARANG KERAS menulis JSON, tanda kurung kurawal {{}}, tanda kutip string, atau metadata di dalam field text.
   - Setiap field "text" HARUS diisi kalimat nyata bahasa Indonesia yang siap cetak di media.

B) SEMUA FAKTA WAJIB DIMASUKKAN KE DALAM FULL TEXT:
   - Setiap fakta dari bahan input dan 5W+1H (peristiwa, nama tokoh/pejabat, lokasi, waktu, alasan/motif, kronologi lapangan, angka nominal, barang bukti, pasal hukum, dan tindak lanjut) WAJIB dimasukkan secara utuh ke dalam teks berita.
   - Jangan ada fakta penting yang dibuang atau diabaikan.

C) KUTIPAN LANGSUNG NARASUMBER ADALAH BERITA FAKTA — BEBAS TANPA BATASAN:
   - Kutipan langsung narasumber adalah fakta otentik berita.
   - JANGAN batasi kutipan langsung narsum: masukkan semua kutipan fakta yang ada pada bahan mentah secara proporsional di deskripsi fakta naskah.

D) SUB-JUDUL H2 ADALAH TEMA FAKTA UTAMA — MAKSIMAL 3 H2:
   - Sub-judul H2 mengangkat tema fakta inti peristiwa (misal: kronologi fakta, kerugian & barang bukti, dan tindak lanjut/hukum).
   - JUMLAH SUB-JUDUL H2: MAKSIMAL 3 H2 (tepat 2 hingga 3 H2, tidak boleh lebih dari 3).

E) DESKRIPSI H2 MEMUAT CONTEXT DAN OPINI — MAKSIMAL 3 PARAGRAF PER H2:
   - Di bawah setiap sub-judul H2, deskripsi memuat paragraf berlabel CONTEXT (penjelasan mekanisme, latar belakang regulasi/kebijakan) dan OPINI (analisis editorial mendalam & catatan kritis redaksi).
   - JUMLAH PARAGRAF DESKRIPSI PER H2: MAKSIMAL 3 PARAGRAF per sub-judul H2.
   - Wajib ada minimal 2 paragraf berlabel "OPINI" di dalam naskah:
     * OPINI ke-1 (di H2 ke-2): Analisis editorial implikasi topik bagi publik/ekonomi/tata kelola.
     * OPINI ke-2 (di H2 ke-3): Catatan kritis redaksi dan evaluasi mitigasi risiko ke depan.

F) TARGET KATA: 300 - 500 KATA TOTAL (ZONA AMAN GOOGLE 2026):
   - Naskah WAJIB berada di rentang 300 hingga 500 kata (target ideal 360-430 kata).
   - SANGAT DILARANG menghasilkan di bawah 300 kata, dan jangan melebihi 500 kata agar tetap mobile-friendly.

G) KETERBACAAN MOBILE:
   - Setiap paragraf: TEPAT 2-3 KALIMAT (tidak boleh 1 kalimat, tidak boleh lebih dari 3 kalimat).

═══════════════════════════════════════════════════════════════
CONTOH FORMAT TEXT YANG BENAR (isi harus sesuai topik aktual):
═══════════════════════════════════════════════════════════════
Contoh text FACT yang benar:
"Menteri Keuangan Sri Mulyani menegaskan pemerintah tidak akan mundur dari target defisit APBN 2026 sebesar 2,3 persen dari PDB. Langkah tersebut diambil menyusul tekanan global akibat pelemahan harga komoditas yang berdampak pada penerimaan negara. Penegasan ini disampaikan dalam rapat koordinasi fiskal bersama gubernur bank sentral di Jakarta, Selasa (9/9)."

Contoh text OPINI yang benar:
"Kebijakan ini menunjukkan komitmen fiskal yang positif, namun para analis mengingatkan bahwa konsistensi eksekusi di tingkat daerah masih menjadi tantangan nyata yang belum terjawab. Redaksi menilai transparansi mekanisme distribusi dan audit independen menjadi kunci agar kebijakan ini benar-benar berdampak bagi masyarakat lapis bawah."

SEKARANG TULIS NASKAH BERDASARKAN BAHAN DI ATAS.
WAJIB berada di rentang 300-500 kata (zona aman).
Keluarkan HANYA JSON valid tanpa markdown code block, tanpa komentar apapun di luar JSON:
{{
  "title": "{selected_title}",
  "word_count": 380,
  "h2_headings": [
    "Sub-judul H2 Fakta Pertama",
    "Sub-judul H2 Fakta Kedua",
    "Sub-judul H2 Fakta Ketiga"
  ],
  "sections": [
    {{
      "section_type": "LEAD",
      "heading": null,
      "paragraphs": [
        {{
          "order": 1,
          "type": "FACT",
          "text": "TULIS KALIMAT PROSA BERITA NYATA DI SINI — bukan contoh, bukan placeholder. Minimal 40 kata, maksimal 50 kata, 3 kalimat, memuat who-what-where-when-why-how.",
          "quote": null
        }}
      ]
    }},
    {{
      "section_type": "H2_KRONOLOGI",
      "heading": "TULIS SUB-JUDUL H2 KRONOLOGI YANG SPESIFIK",
      "paragraphs": [
        {{
          "order": 2,
          "type": "FACT",
          "text": "TULIS KALIMAT PROSA KRONOLOGI NYATA DI SINI — 45-55 kata, 2-3 kalimat. Sertakan kutipan narsum #1 dalam teks.",
          "quote": "TULIS KUTIPAN VERBATIM NARSUM PERTAMA DI SINI"
        }},
        {{
          "order": 3,
          "type": "CONTEXT",
          "text": "TULIS KALIMAT PROSA KONTEKS KRONOLOGI DI SINI — 45-55 kata, 2-3 kalimat, uraian latar belakang mekanisme/proses.",
          "quote": null
        }}
      ]
    }},
    {{
      "section_type": "H2_KONTEKS",
      "heading": "TULIS SUB-JUDUL H2 KONTEKS YANG SPESIFIK",
      "paragraphs": [
        {{
          "order": 4,
          "type": "CONTEXT",
          "text": "TULIS KALIMAT PROSA KONTEKS KEBIJAKAN DI SINI — 45-55 kata, 2-3 kalimat, data historis dan regulasi pendukung.",
          "quote": null
        }},
        {{
          "order": 5,
          "type": "OPINI",
          "text": "TULIS KALIMAT ANALISIS EDITORIAL OPINI DI SINI — 45-55 kata, 2-3 kalimat, analisis implikasi kebijakan bagi publik.",
          "quote": null
        }}
      ]
    }},
    {{
      "section_type": "H2_TANGGAPAN",
      "heading": "TULIS SUB-JUDUL H2 TANGGAPAN YANG SPESIFIK",
      "paragraphs": [
        {{
          "order": 6,
          "type": "FACT",
          "text": "TULIS KALIMAT PROSA TANGGAPAN NARSUM DI SINI — 40-50 kata, 2-3 kalimat. Sertakan kutipan narsum #2 dalam teks.",
          "quote": "TULIS KUTIPAN VERBATIM NARSUM KEDUA DI SINI"
        }},
        {{
          "order": 7,
          "type": "OPINI",
          "text": "TULIS CATATAN KRITIS REDAKSI DI SINI — 40-50 kata, 2-3 kalimat, evaluasi independen dan harapan pengawasan ke depan.",
          "quote": null
        }}
      ]
    }},
    {{
      "section_type": "PENUTUP",
      "heading": null,
      "paragraphs": [
        {{
          "order": 8,
          "type": "CONTEXT",
          "text": "TULIS KALIMAT PENUTUP PROSPEK DI SINI — 30-40 kata, 2 kalimat, merangkum agenda dan perkembangan ke depan.",
          "quote": null
        }}
      ]
    }}
  ],
  "seo_check": {{
    "word_count_target_met": true,
    "lead_5w1h_present": true,
    "has_opinion_paragraphs": true,
    "h2_count": 3,
    "quotes_count": 2,
    "mobile_friendly": true,
    "estimated_seo_score": 100
  }}
}}"""

    result_text = provider.generate(prompt, max_tokens=6000)
    
    try:
        data = json.loads(extract_json(result_text))
        
        # Flatten paragraphs
        flat_paragraphs = []
        for sec in data.get("sections", []):
            sec_heading = sec.get("heading")
            for p in sec.get("paragraphs", []):
                p_copy = dict(p)
                p_copy["section_heading"] = sec_heading
                p_copy["section_type"] = sec.get("section_type")
                flat_paragraphs.append(p_copy)
        data["paragraphs"] = flat_paragraphs
        
        # Recalculate real word count
        all_text = " ".join([p.get("text", "") for p in flat_paragraphs])
        data["word_count"] = len(all_text.split())

        # ══════════════════════════════════════════════════════════════════
        # VALIDASI: deteksi paragraf berisi JSON mentah (bug LLM) dan hapus
        # ══════════════════════════════════════════════════════════════════
        clean_paragraphs = []
        for p in flat_paragraphs:
            txt = p.get("text", "")
            # Jika text mengandung tanda JSON struktural, berarti LLM salah output
            looks_like_json = (
                txt.strip().startswith('{') or
                txt.strip().startswith('[') or
                '"section_type"' in txt or
                '"h2_headings"' in txt or
                '"word_count"' in txt or
                '"sections"' in txt or
                '"paragraphs"' in txt
            )
            if not looks_like_json and len(txt.strip()) > 20:
                clean_paragraphs.append(p)
        
        if clean_paragraphs:
            flat_paragraphs = clean_paragraphs
            data["paragraphs"] = flat_paragraphs
        
        # Recalculate after cleaning
        all_text = " ".join([p.get("text", "") for p in flat_paragraphs])
        data["word_count"] = len(all_text.split())

        # ══════════════════════════════════════════════════════════════════
        # AGENTIC SELF-EXPANSION: 2x retry hingga 380-460 kata terpenuhi
        # ══════════════════════════════════════════════════════════════════
        def _flatten_and_clean(sections_data):
            """Helper: flatten sections to paragraphs, skip JSON-contaminated text"""
            result = []
            for sec in sections_data.get("sections", []):
                sec_heading = sec.get("heading")
                for p in sec.get("paragraphs", []):
                    p_copy = dict(p)
                    p_copy["section_heading"] = sec_heading
                    p_copy["section_type"] = sec.get("section_type")
                    txt = p_copy.get("text", "")
                    if (not txt.strip().startswith('{') and
                        '"section_type"' not in txt and
                        '"paragraphs"' not in txt and
                        len(txt.strip()) > 20):
                        result.append(p_copy)
            return result

        def _word_count(paras):
            return len(" ".join([p.get("text", "") for p in paras]).split())

        has_opini = any(p.get("type") == "OPINI" for p in flat_paragraphs)
        current_wc = data["word_count"]

        for attempt in range(2):  # Maksimal 2x percobaan ekspansi
            if current_wc >= 300 and current_wc <= 500 and has_opini:
                break  # Sudah cukup di dalam zona aman 300-500 kata

            print(f"[AGENTIC EXPANSION attempt {attempt+1}] {current_wc} kata, has_opini={has_opini}. Target zona aman 350-430 kata...")

            # Hitung paragraf mana yang pendek
            short_paras = [p for p in flat_paragraphs if len(p.get("text", "").split()) < 40]
            missing_opini = not has_opini

            expand_prompt = f"""Kamu adalah redaktur senior. Naskah ini baru {current_wc} kata, butuh 350-430 kata standar zona aman SEO Google 2026 (300-500 kata).

INFO KONTEN:
- Judul: {selected_title}
- Narasumber / Tokoh: {speaker_display}
- Topik: {topic or "Umum"}
- Bahan asli: {raw_text[:800]}

NASKAH JSON SAAT INI:
{json.dumps(data.get('sections', []), indent=2, ensure_ascii=False)}

TUGAS EKSPANSI (WAJIB SEMUA):
1. SETIAP field "text" HARUS prosa bahasa Indonesia siap cetak. DILARANG JSON/metadata di dalam text.
2. Perpanjang SEMUA paragraf yang kurang dari 45 kata hingga mencapai 50-60 kata (2-3 kalimat).
3. {'TAMBAHKAN 2 paragraf OPINI jika belum ada' if missing_opini else 'Perkuat kedua paragraf OPINI yang sudah ada dengan analisis lebih dalam'}:
   - OPINI ke-1 (H2_KONTEKS): Dampak/implikasi topik ini bagi publik atau sektor terkait.
   - OPINI ke-2 (H2_TANGGAPAN): Catatan kritis, evaluasi, atau rekomendasi ke depan.
4. Pastikan semua fakta dari bahan asli terangkum lengkap.
5. Total hasil WAJIB berada di zona aman 350-430 kata. Setiap paragraf maksimal 3 kalimat.

KEMBALIKAN JSON LENGKAP (struktur sections sama persis)."""

            try:
                expanded_result = provider.generate(expand_prompt, max_tokens=6000)
                expanded_data = json.loads(extract_json(expanded_result))
                flat_exp = _flatten_and_clean(expanded_data)
                exp_wc = _word_count(flat_exp)

                if exp_wc > current_wc:  # Hanya pakai jika lebih panjang
                    expanded_data["paragraphs"] = flat_exp
                    expanded_data["word_count"] = exp_wc
                    data = expanded_data
                    flat_paragraphs = flat_exp
                    current_wc = exp_wc
                    has_opini = any(p.get("type") == "OPINI" for p in flat_paragraphs)
                    print(f"[AGENTIC EXPANSION attempt {attempt+1}] Berhasil: {exp_wc} kata, has_opini={has_opini}")
                else:
                    print(f"[AGENTIC EXPANSION attempt {attempt+1}] Ekspansi tidak membantu ({exp_wc} <= {current_wc}), skip.")
                    break
            except Exception as exp_err:
                print(f"[AGENTIC EXPANSION attempt {attempt+1}] Gagal: {exp_err}")
                break

        # ══════════════════════════════════════════════════════════════════
        # ENFORCE KETERBACAAN MOBILE: Maksimal 3 kalimat per paragraf
        # ══════════════════════════════════════════════════════════════════
        def _enforce_max_3_sentences(paras):
            """Pecah paragraf yang melebihi 3 kalimat agar 100% ramah mobile"""
            result = []
            for p in paras:
                txt = p.get("text", "").strip()
                sentences = [s.strip() for s in re.split(r'(?<=[.!?]["\']?)\s+', txt) if len(s.strip()) > 3]
                if len(sentences) > 3:
                    p1 = dict(p)
                    p1["text"] = " ".join(sentences[:2])
                    result.append(p1)

                    p2 = dict(p)
                    p2["text"] = " ".join(sentences[2:])
                    p2["order"] = p.get("order", 1) + 0.1
                    result.append(p2)
                else:
                    result.append(p)
            return result

        flat_paragraphs = _enforce_max_3_sentences(flat_paragraphs)
        data["paragraphs"] = flat_paragraphs
        all_text = " ".join([p.get("text", "") for p in flat_paragraphs])
        data["word_count"] = len(all_text.split())

        # Bangun full content markdown
        content_lines = []
        last_heading = None
        for p in flat_paragraphs:
            h = p.get("section_heading")
            if h and h != last_heading:
                last_heading = h
                content_lines.append(f"\n## {h}\n")
            content_lines.append(p.get("text", ""))
        data["content"] = "\n\n".join(content_lines).strip()
        
        return data
    except Exception as e:
        print(f"JSON parsing error in quick news: {e}")
        # Coba satu kali retry dengan prompt yang lebih sederhana
        retry_prompt = f"""Kamu adalah jurnalis. Tulis berita {selected_title} sepanjang 380-430 kata dalam format JSON berikut.

PENTING: Setiap field "text" HARUS berisi kalimat prosa berita bahasa Indonesia yang nyata. JANGAN isi dengan JSON, metadata, atau placeholder.

BAHAN: {raw_text}

Output JSON:
{{
  "title": "{selected_title}",
  "word_count": 400,
  "h2_headings": ["Kronologi Kejadian", "Konteks dan Analisis", "Tanggapan dan Catatan Redaksi"],
  "sections": [
    {{"section_type": "LEAD", "heading": null, "paragraphs": [{{"order": 1, "type": "FACT", "text": "TULIS PARAGRAF LEAD 40-50 KATA DI SINI", "quote": null}}]}},
    {{"section_type": "H2_KRONOLOGI", "heading": "Kronologi Kejadian", "paragraphs": [
      {{"order": 2, "type": "FACT", "text": "TULIS PARAGRAF KRONOLOGI 45-55 KATA DI SINI", "quote": "KUTIPAN NARSUM"}},
      {{"order": 3, "type": "CONTEXT", "text": "TULIS PARAGRAF KONTEKS KRONOLOGI 45-55 KATA DI SINI", "quote": null}}
    ]}},
    {{"section_type": "H2_KONTEKS", "heading": "Konteks dan Analisis", "paragraphs": [
      {{"order": 4, "type": "CONTEXT", "text": "TULIS PARAGRAF KONTEKS KEBIJAKAN 45-55 KATA DI SINI", "quote": null}},
      {{"order": 5, "type": "OPINI", "text": "TULIS ANALISIS OPINI EDITORIAL 45-55 KATA DI SINI", "quote": null}}
    ]}},
    {{"section_type": "H2_TANGGAPAN", "heading": "Tanggapan dan Catatan Redaksi", "paragraphs": [
      {{"order": 6, "type": "FACT", "text": "TULIS PARAGRAF TANGGAPAN 40-50 KATA DI SINI", "quote": "KUTIPAN NARSUM KE-2"}},
      {{"order": 7, "type": "OPINI", "text": "TULIS CATATAN KRITIS REDAKSI 40-50 KATA DI SINI", "quote": null}}
    ]}},
    {{"section_type": "PENUTUP", "heading": null, "paragraphs": [{{"order": 8, "type": "CONTEXT", "text": "TULIS PARAGRAF PENUTUP 30-40 KATA DI SINI", "quote": null}}]}}
  ],
  "seo_check": {{"word_count_target_met": true, "lead_5w1h_present": true, "has_opinion_paragraphs": true, "h2_count": 3, "quotes_count": 2, "mobile_friendly": true, "estimated_seo_score": 100}}
}}"""
        try:
            retry_text = provider.generate(retry_prompt, max_tokens=6000)
            retry_data = json.loads(extract_json(retry_text))
            flat_retry = []
            for sec in retry_data.get("sections", []):
                sec_heading = sec.get("heading")
                for p in sec.get("paragraphs", []):
                    p_copy = dict(p)
                    p_copy["section_heading"] = sec_heading
                    p_copy["section_type"] = sec.get("section_type")
                    txt = p_copy.get("text", "")
                    if not txt.strip().startswith('{') and len(txt.strip()) > 20:
                        flat_retry.append(p_copy)
            retry_data["paragraphs"] = flat_retry
            retry_text_all = " ".join([p.get("text", "") for p in flat_retry])
            retry_data["word_count"] = len(retry_text_all.split())
            
            # Build content
            content_lines = []
            last_h = None
            for p in flat_retry:
                h = p.get("section_heading")
                if h and h != last_h:
                    last_h = h
                    content_lines.append(f"\n## {h}\n")
                content_lines.append(p.get("text", ""))
            retry_data["content"] = "\n\n".join(content_lines).strip()
            return retry_data
        except Exception as retry_err:
            print(f"Retry also failed: {retry_err}")
            raise Exception(f"AI gagal menghasilkan naskah berita yang valid. Coba lagi atau periksa koneksi API. Detail: {str(e)}")


class handler(BaseHTTPRequestHandler):
    """Serverless handler untuk quick news generator (3-Slide flow)"""
    
    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_POST(self):
        """Handle POST request"""
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8')
        
        try:
            req = json.loads(body) if body else {}
        except json.JSONDecodeError:
            self.send_json_response(400, {"error": "Invalid JSON"})
            return
        
        action = req.get('action', 'analyze')
        raw_text = req.get('raw_text', '')
        
        if not raw_text.strip():
            self.send_json_response(400, {"error": "raw_text (kutipan/wawancara narsum) wajib diisi"})
            return
        
        try:
            if action == 'analyze':
                # Slide 1 -> Slide 2: Ekstraksi 5W+1H, Judul, Quotes
                speaker_name = req.get('speaker_name', '')
                speaker_title = req.get('speaker_title', '')
                topic = req.get('topic', '')
                title = req.get('title', '')
                
                result = analyze_interview_narsum(raw_text, speaker_name, speaker_title, topic, title)
                self.send_json_response(200, {"status": "ok", "data": result})
                
            elif action == 'generate':
                # Slide 2 -> Slide 3: Generate Draft Berita 400 Kata SEO 2026
                selected_title = req.get('selected_title', 'Berita Terkini')
                selected_angle = req.get('selected_angle', '')
                five_w_one_h = req.get('five_w_one_h', {})
                quotes = req.get('quotes', [])
                speaker_name = req.get('speaker_name', '')
                speaker_title = req.get('speaker_title', '')
                topic = req.get('topic', '')
                
                result = generate_seo_news_draft(
                    raw_text=raw_text,
                    selected_title=selected_title,
                    selected_angle=selected_angle,
                    five_w_one_h=five_w_one_h,
                    quotes=quotes,
                    speaker_name=speaker_name,
                    speaker_title=speaker_title,
                    topic=topic
                )
                self.send_json_response(200, {"status": "ok", "data": result})
                
            else:
                self.send_json_response(400, {"error": f"Aksi '{action}' tidak dikenali. Gunakan 'analyze' atau 'generate'."})
                
        except Exception as e:
            print(f"Error in quick_news handler: {e}")
            self.send_json_response(500, {"error": str(e)})
    
    def send_json_response(self, status_code, data):
        """Send JSON response dengan CORS headers"""
        self.send_response(status_code)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
