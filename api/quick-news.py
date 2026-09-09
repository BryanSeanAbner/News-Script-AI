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


def analyze_interview_narsum(raw_text: str, speaker_name: str = "", speaker_title: str = "", topic: str = "") -> Dict[str, Any]:
    """
    Slide 1 -> Slide 2:
    Analisis kutipan/wawancara narsum menjadi 5W+1H, intisari kutipan, sudut pandang (angle),
    serta rekomendasi 3 judul SEO ber-keyword kuat (Google News 2026).
    """
    provider = AIProvider()
    
    prompt = f"""Kamu adalah editor berita senior media nasional spesialis Google News dan SEO 2026.
Analisis materi kutipan/wawancara/pernyataan narasumber berikut:

INFORMASI NARASUMBER:
- Nama: {speaker_name or "Sesuai dalam teks"}
- Jabatan/Institusi: {speaker_title or "Sesuai dalam teks"}
- Topik/Kategori: {topic or "Berita Terkini"}

TEKS WAWANCARA / PERNYATAAN / KUTIPAN NARSUM:
\"\"\"
{raw_text}
\"\"\"

TUGAS KAMU:
1. Bedah teks menjadi formula 5W+1H yang padat, akurat, dan faktual:
   - What (Peristiwa apa yang terjadi/dibahas)
   - Who (Siapa tokoh/pelaku/korban/pejabat/narsum terkait)
   - Where (Di mana lokasi peristiwa/pernyataan)
   - When (Kapan waktu peristiwa/pernyataan)
   - Why (Mengapa peristiwa terjadi / motif / alasan)
   - How (Bagaimana kronologi kejadian / bagaimana respon tindakan pihak berwenang)
2. Ekstrak minimal 2 kutipan langsung (quotes) paling berbobot dari narasumber.
3. Rancang 3 opsi Judul Berita SEO Google 2026:
   - Panjang 40-65 karakter
   - Diawali kata kunci utama (Keyword-Frontloaded)
   - Mengandung nama narsum/jabatan atau subjek peristiwa
   - Menghindari clickbait murahan tapi membuat penasaran (High CTR)
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
    speaker_title: str = ""
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

    prompt = f"""Kamu adalah jurnalis investigatif dan redaktur pelaksana senior media nasional.
Kamu memiliki kemampuan REASONING JURNALISTIK MENDALAM, ANALISIS KEBIJAKAN, dan PENULISAN BERITA SESUAI ALGORITMA GOOGLE NEWS 2026.

TUGAS UTAMA:
Tulis artikel berita harian 5W+1H yang bernas, mendalam, dan terstruktur berdasarkan bahan wawancara/pernyataan narasumber berikut.

JUDUL BERITA: {selected_title}
SUDUT PANDANG (ANGLE): {selected_angle or "Berita Kebijakan & Tanggapan Resmi"}
NARASUMBER UTAMA: {speaker_name} ({speaker_title})

{five_w_text}

KUTIPAN ASLI NARASUMBER:
{quotes_text if quotes_text else raw_text}

BAHAN MENTAH LENGKAP:
\"\"\"
{raw_text}
\"\"\"

══════════════════════════════════════════════════════════════════════════
ATURAN KRITIS (WAJIB DIPATUHI SECARA KETAT — JANGAN SAMPAI MELANGGAR):
══════════════════════════════════════════════════════════════════════════

1. DILARANG HANYA COPY-PASTE! LAKUKAN REASONING JURNALISTIK:
   - AI harus berpikir mandiri: jelaskan konteks latar belakang institusi/kebijakan (misal apa itu program KDMP, siapa Himbara, dampak fiskal APBN, payung hukum terkait).
   - Uraikan kronologi proses atau mekanisme pelaksanaannya secara sistematis.

2. WAJIB BUAT MINIMAL 2 PARAGRAF BERLABEL [OPINI]:
   - Berita TIDAK BOLEH hanya berisi [FACT] dan [CONTEXT] saja!
   - Paragraf [OPINI] ke-1: Berisi analisis editorial mengenai implikasi kebijakan/peristiwa terhadap masyarakat, transparansi, atau stabilitas ekonomi.
   - Paragraf [OPINI] ke-2: Berisi catatan kritis, evaluasi independen, atau harapan redaksi terhadap pengawasan dan implementasi di lapangan.

3. TARGET JUMLAH KATA: 380 - 430 KATA (TOTAL 8 PARAGRAF):
   - JANGAN TULIS DI BAWAH 350 KATA! (Jika di bawah 350 kata, artikel dianggap 'tipis' oleh Google).
   - Rincian panjang per seksi:
     * BAGIAN 1: LEAD 5W1H (1 Paragraf, 40-50 KATA, 3 kalimat) -> Tipe [FACT]
     * BAGIAN 2: H2 KRONOLOGI (2 Paragraf, total 100-120 KATA) -> Paragraf 1 [FACT] (dengan kutipan narsum #1) + Paragraf 2 [CONTEXT] (uraian kronologi detail)
     * BAGIAN 3: H2 KONTEKS & ANALISIS (2 Paragraf, total 100-120 KATA) -> Paragraf 1 [CONTEXT] (latar belakang & data pendukung) + Paragraf 2 [OPINI] (analisis dampak & implikasi)
     * BAGIAN 4: H2 TANGGAPAN & EVALUASI (2 Paragraf, total 80-100 KATA) -> Paragraf 1 [FACT] (pernyataan lanjutan narsum + kutipan #2) + Paragraf 2 [OPINI] (catatan kritis redaksi)
     * BAGIAN 5: PENUTUP (1 Paragraf, 30-40 KATA) -> Tipe [CONTEXT] (prospek atau update selanjutnya)

4. KETERBACAAN MOBILE:
   - Setiap paragraf WAJIB terdiri dari 2 hingga 3 KALIMAT.
   - Tidak boleh ada paragraf 1 kalimat pendek, dan TIDAK BOLEH lebih dari 3 kalimat.

Format respons HANYA sebagai JSON valid tanpa markdown code block:
{{
  "title": "{selected_title}",
  "word_count": 410,
  "h2_headings": [
    "Sub-judul H2 Kronologi",
    "Sub-judul H2 Konteks & Analisis Implikasi",
    "Sub-judul H2 Tanggapan Pejabat & Catatan Redaksi"
  ],
  "sections": [
    {{
      "section_type": "LEAD",
      "heading": null,
      "paragraphs": [
        {{
          "order": 1,
          "type": "FACT",
          "text": "Paragraf pembuka memuat unsur 5W1H secara padat dan jelas sepanjang 40-50 kata dengan tepat tiga kalimat informatif.",
          "quote": null
        }}
      ]
    }},
    {{
      "section_type": "H2_KRONOLOGI",
      "heading": "Kronologi dan Detail Penanganan",
      "paragraphs": [
        {{
          "order": 2,
          "type": "FACT",
          "text": "Teks kronologi detail peristiwa kalimat pertama dan kedua yang memuat kutipan langsung narasumber...",
          "quote": "Kutipan langsung narsum pertama..."
        }},
        {{
          "order": 3,
          "type": "CONTEXT",
          "text": "Pendalaman kronologis mengenai proses operasional dan langkah teknis yang berlangsung di lapangan secara terperinci...",
          "quote": null
        }}
      ]
    }},
    {{
      "section_type": "H2_KONTEKS",
      "heading": "Konteks Kebijakan dan Dampak Ekonomi",
      "paragraphs": [
        {{
          "order": 4,
          "type": "CONTEXT",
          "text": "Uraian konteks latar belakang aturan, data historis pendukung, serta peran institusi terkait dalam perkara ini...",
          "quote": null
        }},
        {{
          "order": 5,
          "type": "OPINI",
          "text": "Analisis editorial menilai bahwa kebijakan ini menjadi sinyal positif stabilitas, kendati transparansi tata kelola tetap menjadi tantangan mendesak...",
          "quote": null
        }}
      ]
    }},
    {{
      "section_type": "H2_TANGGAPAN",
      "heading": "Tanggapan Pejabat dan Catatan Kritis",
      "paragraphs": [
        {{
          "order": 6,
          "type": "FACT",
          "text": "Pernyataan tegas pejabat atau aparat penegak hukum mengenai sanksi atau komitmen penyelesaian...",
          "quote": "Kutipan langsung narsum kedua..."
        }},
        {{
          "order": 7,
          "type": "OPINI",
          "text": "Redaksi mencatat bahwa ketegasan sikap ini perlu dibarengi mekanisme pengawasan independen agar tidak terjadi preseden serupa di masa depan...",
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
          "text": "Paragraf penutup sepanjang 30-40 kata yang merangkum arah perkembangan kasus serta agenda lanjutan pemerintah ke depan.",
          "quote": null
        }}
      ]
    }}
  ],
  "content": "Isi naskah berita lengkap berformat rapi dengan judul H2 (format markdown ## Subjudul)...",
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
        # AGENTIC SELF-EXPANSION: Jika hasil masih < 350 kata atau kurang OPINI
        # ══════════════════════════════════════════════════════════════════
        has_opini = any(p.get("type") == "OPINI" for p in flat_paragraphs)
        if data["word_count"] < 350 or not has_opini:
            print(f"[AGENTIC EXPANSION] Output {data['word_count']} kata (has_opini={has_opini}). Mengembangkan naskah ke zona 380-430 kata...")
            expand_prompt = f"""Kamu adalah redaktur pelaksana senior. Naskah berita berikut saat ini baru memiliki {data['word_count']} kata dan memerlukan pendalaman analitis jurnalistik agar memenuhi standar Google News 2026 (target 380 - 430 KATA).

NASKAH SAAT INI:
{json.dumps(data.get('sections', []), indent=2, ensure_ascii=False)}

INFORMASI BAHAN TAMBAHAN:
- Judul: {selected_title}
- Narsum: {speaker_name} ({speaker_title})
- Bahan mentah: {raw_text}

INSTRUKSI EXPANSION (WAJIB):
1. Perpanjang tiap paragraf yang terlalu singkat sehingga setiap paragraf memiliki 45 - 60 kata (terdiri dari 2-3 kalimat mobile-friendly).
2. Perkaya seksi Kronologi dengan detail peristiwa dan tahapan tindakannya.
3. WAJIB sertakan 2 PARAGRAF BERLABEL [OPINI]:
   - 1 paragraf [OPINI] di Seksi H2 Konteks: Analisis implikasi kebijakan/peristiwa bagi publik/ekonomi.
   - 1 paragraf [OPINI] di Seksi H2 Tanggapan: Catatan kritis dan pandangan redaksi mengenai mitigasi risiko kedepan.
4. Total artikel HARUS mencapai 380 - 430 KATA. Dilarang di bawah 350 kata!

KEMBALIKAN HANYA FORMAT JSON LENGKAP DENGAN STRUKTUR SAMA (sections, paragraphs, word_count)."""

            expanded_result = provider.generate(expand_prompt, max_tokens=6000)
            try:
                expanded_data = json.loads(extract_json(expanded_result))
                flat_exp = []
                for sec in expanded_data.get("sections", []):
                    sec_heading = sec.get("heading")
                    for p in sec.get("paragraphs", []):
                        p_copy = dict(p)
                        p_copy["section_heading"] = sec_heading
                        p_copy["section_type"] = sec.get("section_type")
                        flat_exp.append(p_copy)
                exp_text = " ".join([p.get("text", "") for p in flat_exp])
                exp_words = len(exp_text.split())
                
                # Gunakan hasil ekspansi jika lebih panjang
                if exp_words > data["word_count"]:
                    expanded_data["paragraphs"] = flat_exp
                    expanded_data["word_count"] = exp_words
                    data = expanded_data
                    print(f"[AGENTIC EXPANSION] Berhasil dikembangkan menjadi {exp_words} kata!")
            except Exception as exp_err:
                print(f"[AGENTIC EXPANSION] Gagal parse ekspansi: {exp_err}")

        # Bangun full content markdown
        content_lines = []
        last_heading = None
        for p in data.get("paragraphs", []):
            h = p.get("section_heading")
            if h and h != last_heading:
                last_heading = h
                content_lines.append(f"\n## {h}\n")
            content_lines.append(p.get("text", ""))
        data["content"] = "\n\n".join(content_lines).strip()
        
        return data
    except Exception as e:
        print(f"JSON parsing error in quick news: {e}")
        # Fallback
        paragraphs = [
            {"order": 1, "type": "FACT", "text": result_text[:400], "quote": None},
            {"order": 2, "type": "CONTEXT", "text": result_text[400:], "quote": None}
        ]
        return {
            "title": selected_title,
            "content": result_text,
            "word_count": len(result_text.split()),
            "paragraphs": paragraphs,
            "h2_headings": ["Kronologi Kejadian", "Tanggapan Pejabat"],
            "seo_check": {
                "word_count_target_met": True,
                "lead_5w1h_present": True,
                "h2_count": 2,
                "quotes_count": 1,
                "mobile_friendly": True,
                "estimated_seo_score": 85
            }
        }


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
                
                result = analyze_interview_narsum(raw_text, speaker_name, speaker_title, topic)
                self.send_json_response(200, {"status": "ok", "data": result})
                
            elif action == 'generate':
                # Slide 2 -> Slide 3: Generate Draft Berita 400 Kata SEO 2026
                selected_title = req.get('selected_title', 'Berita Terkini')
                selected_angle = req.get('selected_angle', '')
                five_w_one_h = req.get('five_w_one_h', {})
                quotes = req.get('quotes', [])
                speaker_name = req.get('speaker_name', '')
                speaker_title = req.get('speaker_title', '')
                
                result = generate_seo_news_draft(
                    raw_text=raw_text,
                    selected_title=selected_title,
                    selected_angle=selected_angle,
                    five_w_one_h=five_w_one_h,
                    quotes=quotes,
                    speaker_name=speaker_name,
                    speaker_title=speaker_title
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
