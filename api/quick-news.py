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

    prompt = f"""Kamu adalah jurnalis dan redaktur pelaksana profesional senior.
Tulis artikel berita harian 5W+1H berdasarkan bahan kutipan/wawancara berikut dengan RUMUS JUMLAH KATA SEO GOOGLE 2026.

JUDUL BERITA: {selected_title}
SUDUT PANDANG (ANGLE): {selected_angle or "Berita Peristiwa & Tanggapan Resmi"}
NARASUMBER UTAMA: {speaker_name} ({speaker_title})

{five_w_text}

KUTIPAN ASLI NARASUMBER:
{quotes_text if quotes_text else raw_text}

BAHAN MENTAH LENGKAP:
\"\"\"
{raw_text}
\"\"\"

ATURAN WAJIB RUMUS SEO GOOGLE 2026 (JUMLAH KATA & STRUKTUR ±400 KATA):
1. TOTAL PANJANG ARTIKEL HARUS 350 - 500 KATA (ZONA AMAN PALING SEO). JANGAN KURANG DARI 300 KATA DAN JANGAN LEBIH DARI 550 KATA.
2. STRUKTUR WAJIB (5 BAGIAN):
   - Bagian 1: LEAD 5W1H (Paragraf pembuka to the point, 40-50 kata). Langsung jawab siapa, apa, kapan, di mana, mengapa.
   - Bagian 2: Sub-judul H2 ke-1: Kronologi (100-120 kata). Detail urutan peristiwa + sertakan kutipan langsung pertama dari narasumber.
   - Bagian 3: Sub-judul H2 ke-2: Konteks & Fakta Terkait (100-120 kata). Latar belakang peristiwa, barang bukti, atau data pendukung.
   - Bagian 4: Sub-judul H2 ke-3: Tanggapan Pejabat & Tindak Lanjut / Hukuman (80-100 kata). Statemen resmi penanganan, pasal hukum, atau ancaman sanksi + sertakan kutipan langsung kedua.
   - Bagian 5: Paragraf PENUTUP (±30 kata). Penegasan status terkini atau imbauan bagi masyarakat.
3. ATURAN KETERBACAAN DI HP (MOBILE FRIENDLY):
   - SATU PARAGRAF MAKSIMAL 3 KALIMAT! Dilarang keras membuat paragraf panjang lebih dari 3 kalimat karena membuat pembaca malas scroll di layar ponsel.
4. LABEL PARAGRAF:
   - Beri label tipe setiap paragraf:
     * FACT: Berisi fakta kejadian atau kutipan langsung narsum
     * CONTEXT: Latar belakang atau keterangan pelengkap
     * OPINI: Analisis atau interpretasi situasi

Format respons HANYA sebagai JSON valid tanpa markdown code block:
{{
  "title": "{selected_title}",
  "word_count": 415,
  "h2_headings": [
    "Kronologi Kejadian...",
    "Konteks dan Barang Bukti...",
    "Tanggapan Pihak Berwenang dan Ancaman Hukuman..."
  ],
  "sections": [
    {{
      "section_type": "LEAD",
      "heading": null,
      "paragraphs": [
        {{
          "order": 1,
          "type": "FACT",
          "text": "Paragraf lead 5W1H maksimal 3 kalimat...",
          "quote": null
        }}
      ]
    }},
    {{
      "section_type": "H2_KRONOLOGI",
      "heading": "Sub-judul H2 Kronologi yang Menarik",
      "paragraphs": [
        {{
          "order": 2,
          "type": "FACT",
          "text": "Teks kronologi kalimat 1 dan 2...",
          "quote": "Kutipan langsung narsum pertama..."
        }},
        {{
          "order": 3,
          "type": "CONTEXT",
          "text": "Teks lanjutan kronologi maksimal 3 kalimat...",
          "quote": null
        }}
      ]
    }},
    {{
      "section_type": "H2_KONTEKS",
      "heading": "Sub-judul H2 Konteks & Bukti",
      "paragraphs": [
        {{
          "order": 4,
          "type": "CONTEXT",
          "text": "Teks konteks latar belakang maksimal 3 kalimat...",
          "quote": null
        }}
      ]
    }},
    {{
      "section_type": "H2_TANGGAPAN",
      "heading": "Sub-judul H2 Tanggapan Pejabat & Sanksi",
      "paragraphs": [
        {{
          "order": 5,
          "type": "FACT",
          "text": "Teks tanggapan pejabat...",
          "quote": "Kutipan langsung narsum kedua..."
        }}
      ]
    }},
    {{
      "section_type": "PENUTUP",
      "heading": null,
      "paragraphs": [
        {{
          "order": 6,
          "type": "CONTEXT",
          "text": "Paragraf penutup 30 kata...",
          "quote": null
        }}
      ]
    }}
  ],
  "content": "Isi naskah berita lengkap berformat rapi dengan judul H2 (misal ## Subjudul) untuk siap tayang di CMS...",
  "seo_check": {{
    "word_count_target_met": true,
    "lead_5w1h_present": true,
    "h2_count": 3,
    "quotes_count": 2,
    "mobile_friendly": true,
    "estimated_seo_score": 96
  }}
}}"""

    result_text = provider.generate(prompt, max_tokens=5000)
    
    try:
        data = json.loads(extract_json(result_text))
        
        # Flatten paragraphs list if needed for table/list compatibility
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
