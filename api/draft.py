"""
Serverless Function: Draft Generation
Endpoint: /api/draft
"""

import json
import os
from http.server import BaseHTTPRequestHandler
from typing import Dict, List
import sys

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
    """
    Multi-provider AI adapter dengan fallback urutan (FREE MODELS ONLY):
    1. OpenRouter AI (Free: nex-agi/nex-n2.5-mini:free, nex-agi/nex-n2.5-pro:free)
    2. Google Gemini AI (Free: gemini-3.1-flash-lite, gemini-3-flash-preview)
    3. Groq AI (Free: openai/gpt-oss-120b, openai/gpt-oss-20b)
    
    Setiap provider mencoba Model 1 terlebih dahulu, jika gagal/rate limit beralih ke Model 2,
    sebelum melanjutkan ke provider berikutnya. Jaminan 100% FREE MODELS ONLY (tanpa opsi berbayar).
    """
    
    def __init__(self):
        self.openrouter_key = os.getenv('OPENROUTER_API_KEY', '')
        self.gemini_key = os.getenv('GEMINI_API_KEY', '')
        self.groq_key = os.getenv('GROQ_API_KEY') or os.getenv('GROK_API_KEY', '')

        # Model Gratis (100% Free / Free-tier) - FREE MODELS ONLY
        self.openrouter_models = [
            "nex-agi/nex-n2.5-mini:free",
            "nex-agi/nex-n2.5-pro:free"
        ]
        self.gemini_models = [
            "gemini-3.1-flash-lite",
            "gemini-3-flash-preview"
        ]
        self.groq_models = [
            "openai/gpt-oss-120b",
            "openai/gpt-oss-20b"
        ]
    
    def generate(self, prompt: str, max_tokens: int = 4096) -> str:
        """Generate text menggunakan fallback OpenRouter -> Gemini -> Groq dengan 2 model gratis per provider"""
        errors = []
        
        # ── 1. Priority 1: OpenRouter AI ─────────────────────────────────────
        if self.openrouter_key and OpenAI:
            try:
                client = OpenAI(
                    api_key=self.openrouter_key,
                    base_url="https://openrouter.ai/api/v1",
                    default_headers={
                        "HTTP-Referer": "https://newsscript.ai",
                        "X-Title": "NewsScript AI",
                    }
                )
                for model_name in self.openrouter_models:
                    try:
                        print(f"[AIProvider] Mencoba OpenRouter model: {model_name}...")
                        response = client.chat.completions.create(
                            model=model_name,
                            messages=[{"role": "user", "content": prompt}],
                            max_tokens=min(max_tokens, 4096),
                            temperature=0.3
                        )
                        content = response.choices[0].message.content
                        if content and len(content.strip()) > 0:
                            print(f"[AIProvider] Berhasil dengan OpenRouter ({model_name})")
                            return content
                    except Exception as model_err:
                        print(f"[AIProvider] OpenRouter ({model_name}) gagal: {model_err}")
                        errors.append(f"OpenRouter ({model_name}): {model_err}")
            except Exception as client_err:
                print(f"[AIProvider] OpenRouter client error: {client_err}")
                errors.append(f"OpenRouter client: {client_err}")
        
        # ── 2. Priority 2: Google Gemini AI ──────────────────────────────────
        if self.gemini_key and genai:
            try:
                genai.configure(api_key=self.gemini_key)
                for model_name in self.gemini_models:
                    try:
                        print(f"[AIProvider] Mencoba Gemini model: {model_name}...")
                        model = genai.GenerativeModel(model_name)
                        response = model.generate_content(prompt)
                        if response and response.text and len(response.text.strip()) > 0:
                            print(f"[AIProvider] Berhasil dengan Gemini ({model_name})")
                            return response.text
                    except Exception as model_err:
                        print(f"[AIProvider] Gemini ({model_name}) gagal: {model_err}")
                        errors.append(f"Gemini ({model_name}): {model_err}")
            except Exception as client_err:
                print(f"[AIProvider] Gemini client error: {client_err}")
                errors.append(f"Gemini client: {client_err}")
        
        # ── 3. Priority 3: Groq AI ───────────────────────────────────────────
        if self.groq_key and Groq:
            try:
                client = Groq(api_key=self.groq_key)
                for model_name in self.groq_models:
                    try:
                        print(f"[AIProvider] Mencoba Groq model: {model_name}...")
                        response = client.chat.completions.create(
                            model=model_name,
                            messages=[{"role": "user", "content": prompt}],
                            max_tokens=min(max_tokens, 8000),
                            temperature=0.3
                        )
                        content = response.choices[0].message.content
                        if content and len(content.strip()) > 0:
                            print(f"[AIProvider] Berhasil dengan Groq ({model_name})")
                            return content
                    except Exception as model_err:
                        print(f"[AIProvider] Groq ({model_name}) gagal: {model_err}")
                        errors.append(f"Groq ({model_name}): {model_err}")
            except Exception as client_err:
                print(f"[AIProvider] Groq client error: {client_err}")
                errors.append(f"Groq client: {client_err}")
        
        err_detail = " | ".join(errors) if errors else "Tidak ada API key yang valid."
        raise Exception(f"Semua AI providers (OpenRouter -> Gemini -> Groq) gagal. Detail: {err_detail}")


import re


def extract_json(text: str) -> str:
    """Extract JSON dari response yang mungkin berisi markdown"""
    text = text.strip()
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0]
    elif "```" in text:
        text = text.split("```")[1].split("```")[0]
    return text.strip()


def parse_draft_with_labels(raw_text: str, facts: List[Dict]) -> Dict:
    """
    Fallback parser: Extract paragraphs dengan label [FACT], [CONTEXT], [OPINI]
    dari raw text jika JSON parsing gagal
    """
    paragraphs = []
    
    # Split by double newline untuk dapat paragraf
    blocks = raw_text.split('\n\n')
    
    order = 1
    for block in blocks:
        block = block.strip()
        if not block or len(block) < 20:  # Skip paragraf terlalu pendek
            continue
        
        # Detect label di awal paragraf
        label_match = re.match(r'^\[?(FACT|CONTEXT|OPINI)\]?\s*:?\s*(.+)', block, re.IGNORECASE | re.DOTALL)
        
        if label_match:
            para_type = label_match.group(1).upper()
            para_text = label_match.group(2).strip()
        else:
            # Jika tidak ada label explicit, coba detect dari keywords
            block_lower = block.lower()
            if any(word in block_lower for word in ['menurut', 'kata', 'ungkap', 'jelas', 'data menunjukkan']):
                para_type = 'FACT'
            elif any(word in block_lower for word in ['seharusnya', 'mungkin', 'tampaknya', 'diduga', 'kemungkinan']):
                para_type = 'OPINI'
            else:
                para_type = 'CONTEXT'
            para_text = block
        
        # Remove label dari text jika masih ada
        para_text = re.sub(r'^\[?(FACT|CONTEXT|OPINI)\]?\s*:?\s*', '', para_text, flags=re.IGNORECASE)
        
        # Detect quote (text dalam kutip ganda)
        quote_match = re.search(r'"([^"]{20,200})"', para_text)
        quote = quote_match.group(1) if quote_match else None
        
        # Try to match fact ID
        source_fact_id = None
        if para_type == 'FACT' and facts:
            # Simple matching: cari fact yang punya overlap text
            for fact in facts[:10]:  # Check top 10 facts
                fact_text = fact.get('text', '').lower()
                if fact_text and len(fact_text) > 20:
                    # Check if ada substring match (minimal 20 chars)
                    para_lower = para_text.lower()
                    if any(fact_text[i:i+20] in para_lower for i in range(0, len(fact_text)-20, 10)):
                        source_fact_id = fact.get('id')
                        break
        
        paragraphs.append({
            'order': order,
            'type': para_type,
            'text': para_text,
            'source_fact_id': source_fact_id,
            'quote': quote
        })
        order += 1
    
    # Build full content (tanpa label)
    content = '\n\n'.join([p['text'] for p in paragraphs])
    
    # Calculate label stats
    label_stats = {'FACT': 0, 'CONTEXT': 0, 'OPINI': 0}
    for p in paragraphs:
        t = p.get('type', 'CONTEXT')
        label_stats[t] = label_stats.get(t, 0) + 1
    
    return {
        'content': content,
        'paragraphs': paragraphs,
        'word_count': len(content.split()),
        'label_stats': label_stats,
        'parsed_via': 'fallback_regex'
    }


def generate_draft(angle_title: str, article_title: str, facts: List[Dict]) -> Dict:
    """Generate draft artikel berlabel [FACT/CONTEXT/OPINI]"""
    provider = AIProvider()
    
    facts_text = "\n".join([f"- {f.get('text', '')}" for f in facts])
    
    prompt = f"""Kamu adalah jurnalis dan redaktur pelaksana senior.
Tulis artikel berita berkualitas tinggi dengan REASONING JURNALISTIK MENDALAM dan RUMUS JUMLAH KATA SEO GOOGLE 2026.

Judul: {article_title}
Sudut Pandang: {angle_title}

Fakta yang tersedia:
{facts_text}

══════════════════════════════════════════════════════════════════════════
ATURAN KRITIS (WAJIB DIPATUHI):
══════════════════════════════════════════════════════════════════════════
1. JANGAN HANYA COPY-PASTE! AI harus melakukan penalaran (reasoning) mandiri:
   - Terangkan latar belakang isu, institusi terkait, dan regulasi yang menaungi.
   - Uraikan kronologi secara terperinci.
2. WAJIB MENYERTAKAN MINIMAL 2 PARAGRAF BERLABEL [OPINI]:
   - Berisi analisis independen redaksi/pengamat tentang implikasi kebijakan/peristiwa bagi publik.
   - Catatan kritis evaluasi mitigasi risiko ke depan.
3. TOTAL PANJANG ARTIKEL HARUS 380 - 430 KATA (ZONA AMAN PALING SEO). JANGAN KURANG DARI 350 KATA!
4. STRUKTUR 8 PARAGRAF:
   - Paragraf 1 (Lead 5W1H): 40-50 kata to the point (3 kalimat lengkap) -> [FACT]
   - H2 ke-1 (Kronologi): 2 paragraf, total 100-120 kata -> [FACT] (dengan kutipan) + [CONTEXT]
   - H2 ke-2 (Konteks & Analisis): 2 paragraf, total 100-120 kata -> [CONTEXT] + [OPINI]
   - H2 ke-3 (Tanggapan Resmi & Catatan): 2 paragraf, total 80-100 kata -> [FACT] (dengan kutipan) + [OPINI]
   - Penutup: 1 paragraf, 30-40 kata -> [CONTEXT]
5. KETERBACAAN MOBILE: Setiap paragraf WAJIB terdiri dari 2 hingga 3 KALIMAT (maks 3 kalimat).

Format respons sebagai JSON valid:
{{
    "content": "Isi artikel lengkap dengan sub-judul H2 (format markdown ## Subjudul) dan paragraf berlabel",
    "paragraphs": [
        {{
            "order": 1,
            "type": "FACT",
            "text": "Paragraf pembuka lead 5W1H tanpa label di dalam teks (40-50 kata, tepat 3 kalimat)...",
            "source_fact_id": "fact_1",
            "quote": null
        }},
        {{
            "order": 2,
            "type": "FACT",
            "text": "Teks kronologi dengan kutipan langsung narsum...",
            "source_fact_id": "fact_2",
            "quote": "kutipan verbatim narsum"
        }},
        {{
            "order": 3,
            "type": "CONTEXT",
            "text": "Pendalaman kronologi detail pelaksanaan di lapangan...",
            "source_fact_id": null,
            "quote": null
        }},
        {{
            "order": 4,
            "type": "CONTEXT",
            "text": "Konteks latar belakang aturan dan peran institusi...",
            "source_fact_id": null,
            "quote": null
        }},
        {{
            "order": 5,
            "type": "OPINI",
            "text": "Analisis editorial menilai bahwa kebijakan ini memberikan kepastian namun membutuhkan pengawasan ketat...",
            "source_fact_id": null,
            "quote": null
        }},
        {{
            "order": 6,
            "type": "FACT",
            "text": "Pernyataan tindak lanjut dari pihak berwenang...",
            "source_fact_id": null,
            "quote": "kutipan kedua narsum"
        }},
        {{
            "order": 7,
            "type": "OPINI",
            "text": "Catatan kritis redaksi mengingatkan pentingnya transparansi pengurus agar tidak membebani APBN...",
            "source_fact_id": null,
            "quote": null
        }},
        {{
            "order": 8,
            "type": "CONTEXT",
            "text": "Paragraf penutup merangkum arah perkembangan kasus selanjutnya.",
            "source_fact_id": null,
            "quote": null
        }}
    ],
    "word_count": 412,
    "label_stats": {{
        "FACT": 3,
        "CONTEXT": 3,
        "OPINI": 2
    }}
}}"""
    
    result_text = provider.generate(prompt, max_tokens=8000)
    
    try:
        data = json.loads(extract_json(result_text))
        
        # Ensure word_count
        all_text = " ".join([p.get("text", "") for p in data.get("paragraphs", [])])
        data["word_count"] = len(all_text.split()) if all_text else len(data.get("content", "").split())
        
        # Ensure label_stats
        stats = {"FACT": 0, "CONTEXT": 0, "OPINI": 0}
        for p in data.get("paragraphs", []):
            t = p.get("type", "CONTEXT")
            stats[t] = stats.get(t, 0) + 1
        data["label_stats"] = stats
        
        # Agentic self-expansion jika < 350 kata atau belum ada OPINI
        if data["word_count"] < 350 or stats.get("OPINI", 0) == 0:
            print(f"[DRAFT EXPANSION] Draft only {data['word_count']} words. Expanding to 380-430 words...")
            exp_prompt = f"""Kamu adalah redaktur senior. Naskah berita berikut baru memiliki {data['word_count']} kata dan memerlukan pengembangan reasoning analitis agar mencapai 380 - 430 KATA sesuai standar Google News 2026.

NASKAH SAAT INI:
{json.dumps(data.get('paragraphs', []), indent=2, ensure_ascii=False)}

INSTRUKSI:
1. Perpanjang tiap paragraf agar memuat 45-60 kata (2-3 kalimat per paragraf).
2. WAJIB sertakan minimal 2 paragraf bertipe OPINI (analisis implikasi & catatan kritis redaksi).
3. Total panjang HARUS mencapai 380-430 kata.
KEMBALIKAN HANYA JSON VALID LENGKAP."""
            exp_res = provider.generate(exp_prompt, max_tokens=8000)
            try:
                exp_data = json.loads(extract_json(exp_res))
                exp_paras = exp_data.get("paragraphs", [])
                exp_all_text = " ".join([p.get("text", "") for p in exp_paras])
                exp_words = len(exp_all_text.split())
                if exp_words > data["word_count"]:
                    exp_data["word_count"] = exp_words
                    data = exp_data
            except Exception as e_exp:
                print(f"Draft expansion failed: {e_exp}")
        
        # Validate paragraphs structure
        if not data.get("paragraphs") or len(data.get("paragraphs", [])) == 0:
            # JSON ada tapi paragraphs kosong, coba parse ulang
            print("Warning: JSON parsed but paragraphs empty, using fallback parser")
            return parse_draft_with_labels(result_text, facts)
        
        data["parsed_via"] = "json_success"
        return data
        
    except json.JSONDecodeError as e:
        # JSON parsing gagal, gunakan fallback regex parser
        print(f"JSON decode failed: {e}, using fallback parser")
        
        try:
            return parse_draft_with_labels(result_text, facts)
        except Exception as fallback_error:
            # Last resort: return raw text dengan minimal structure
            print(f"Fallback parser also failed: {fallback_error}")
            return {
                "content": result_text,
                "word_count": len(result_text.split()),
                "paragraphs": [{
                    "order": 1,
                    "type": "CONTEXT",
                    "text": result_text,
                    "source_fact_id": None,
                    "quote": None
                }],
                "label_stats": {"FACT": 0, "CONTEXT": 1, "OPINI": 0},
                "parsed_via": "emergency_fallback",
                "raw_response": result_text
            }


class handler(BaseHTTPRequestHandler):
    """Serverless handler untuk draft generation"""
    
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
        
        angle_title = req.get('angle_title', '')
        article_title = req.get('article_title', '')
        facts = req.get('facts', [])
        
        if not article_title:
            self.send_json_response(400, {"error": "article_title required"})
            return
        
        try:
            result = generate_draft(angle_title, article_title, facts)
            self.send_json_response(200, {"status": "ok", "data": result})
        except Exception as e:
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
