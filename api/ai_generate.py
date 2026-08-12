"""
Serverless Function untuk AI Generation (Stateless)
Setiap endpoint menerima data lengkap di request body, tidak ada session tracking
"""

import json
import os
from http.server import BaseHTTPRequestHandler
from typing import Optional, Dict, List
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
    """Multi-provider AI adapter untuk Groq → Gemini → OpenRouter fallback"""
    
    def __init__(self):
        self.groq_key = os.getenv('GROK_API_KEY', '')
        self.gemini_key = os.getenv('GEMINI_API_KEY', '')
        self.openrouter_key = os.getenv('OPENROUTER_API_KEY', '')
    
    def generate(self, prompt: str, task: str = "default", max_tokens: int = 4096) -> str:
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


# ══════════════════════════════════════════════════════════════════════════
# STEP 2: Fact Extraction
# ══════════════════════════════════════════════════════════════════════════

def extract_facts(article_text: str) -> Dict:
    """Extract facts dari artikel"""
    provider = AIProvider()
    
    prompt = f"""Analisis artikel berikut dan ekstrak faktanya sebagai JSON.

Artikel:
{article_text}

Berikan respons HANYA sebagai JSON (tanpa markdown), dengan format:
{{
    "facts": [
        {{"id": "fact_1", "text": "Fakta yang diekstrak", "source": "referensi"}},
        {{"id": "fact_2", "text": "Fakta lain", "source": "referensi"}}
    ],
    "total_facts": 2,
    "summary": "Ringkasan singkat artikel"
}}"""
    
    result_text = provider.generate(prompt, task="fact_extraction", max_tokens=2048)
    
    try:
        return json.loads(extract_json(result_text))
    except json.JSONDecodeError:
        return {"facts": [], "total_facts": 0, "summary": "", "raw_response": result_text}


# ══════════════════════════════════════════════════════════════════════════
# STEP 3: Gap Analysis & Angle Mapping
# ══════════════════════════════════════════════════════════════════════════

def generate_gap_analysis(article_text: str, facts: List[Dict]) -> Dict:
    """Analisis gap dan generate 3 angles"""
    provider = AIProvider()
    
    facts_text = "\n".join([f"- {f['text']}" for f in facts])
    
    prompt = f"""Berdasarkan artikel dan fakta berikut, identifikasi gap editorial dan buat 3 sudut pandang (angle) berita yang berbeda.

Artikel:
{article_text}

Fakta yang tersedia:
{facts_text}

Berikan respons HANYA sebagai JSON:
{{
    "gaps": [
        {{"id": "gap_1", "title": "Gap Editorial", "description": "Penjelasan gap", "gap_type": "missing_context"}},
        {{"id": "gap_2", "title": "Gap lain", "description": "Penjelasan", "gap_type": "bias"}}
    ],
    "angles": [
        {{
            "id": "angle_1",
            "angle_title": "Judul Angle 1",
            "angle_hook": "Hook menarik untuk angle ini",
            "angle_type": "investigative",
            "tone": "serious",
            "target_audience": "general_public",
            "estimated_word_count": 800
        }},
        {{
            "id": "angle_2",
            "angle_title": "Judul Angle 2",
            "angle_hook": "Hook berbeda",
            "angle_type": "human_interest",
            "tone": "empathetic",
            "target_audience": "general_public",
            "estimated_word_count": 700
        }},
        {{
            "id": "angle_3",
            "angle_title": "Judul Angle 3",
            "angle_hook": "Hook ketiga",
            "angle_type": "analytical",
            "tone": "objective",
            "target_audience": "educated_readers",
            "estimated_word_count": 900
        }}
    ],
    "analysis_notes": "Catatan singkat hasil analisis"
}}"""
    
    result_text = provider.generate(prompt, task="gap_analysis", max_tokens=2048)
    
    try:
        return json.loads(extract_json(result_text))
    except json.JSONDecodeError:
        return {"gaps": [], "angles": [], "analysis_notes": "", "raw_response": result_text}


# ══════════════════════════════════════════════════════════════════════════
# STEP 4: Generate Title Recommendations
# ══════════════════════════════════════════════════════════════════════════

def generate_titles(angle_title: str, angle_hook: str, facts: List[Dict]) -> Dict:
    """Generate 5 rekomendasi judul dari angle"""
    provider = AIProvider()
    
    facts_text = "\n".join([f"- {f['text']}" for f in facts[:10]])  # Top 10 facts only
    
    prompt = f"""Berdasarkan angle berita berikut, buatkan 5 rekomendasi judul artikel yang menarik dan SEO-friendly.

Angle: {angle_title}
Hook: {angle_hook}

Fakta pendukung:
{facts_text}

Berikan respons HANYA sebagai JSON:
{{
    "titles": [
        {{
            "id": "title_1",
            "text": "Judul Artikel yang Menarik dan SEO",
            "style": "informative",
            "seo_score": 0.9,
            "char_count": 50,
            "notes": "Catatan singkat kenapa judul ini bagus"
        }},
        {{"id": "title_2", "text": "Judul Kedua", "style": "provocative", "seo_score": 0.85, "char_count": 45, "notes": "..."}}
    ]
}}

Buat 5 variasi judul dengan style berbeda: informative, provocative, analytical, empathetic, urgent."""
    
    result_text = provider.generate(prompt, task="title_generation", max_tokens=1024)
    
    try:
        return json.loads(extract_json(result_text))
    except json.JSONDecodeError:
        return {"titles": [], "raw_response": result_text}


# ══════════════════════════════════════════════════════════════════════════
# STEP 5: Draft Generation
# ══════════════════════════════════════════════════════════════════════════

def generate_draft(angle_title: str, article_title: str, facts: List[Dict]) -> Dict:
    """Generate draft artikel berlabel [FACT/CONTEXT/OPINI]"""
    provider = AIProvider()
    
    facts_text = "\n".join([f"- {f['text']}" for f in facts])
    
    prompt = f"""Tulis draft artikel berita investigatif dengan struktur berlabel.

Judul: {article_title}
Sudut Pandang: {angle_title}

Fakta yang tersedia:
{facts_text}

Tulis artikel 600-800 kata dengan struktur:
- Setiap paragraf diberi label [FACT], [CONTEXT], atau [OPINI]
- [FACT]: Paragraf berisi fakta terverifikasi dari sumber
- [CONTEXT]: Paragraf berisi konteks atau analisis (perlu validasi AI)
- [OPINI]: Paragraf berisi opini atau spekulasi (perlu konfirmasi editor)

Format respons sebagai JSON:
{{
    "content": "Isi artikel lengkap dengan paragraf berlabel",
    "paragraphs": [
        {{
            "order": 1,
            "type": "FACT",
            "text": "Paragraf pertama tanpa label di teks",
            "source_fact_id": "fact_1",
            "quote": "kutipan verbatim dari sumber (opsional)"
        }},
        {{
            "order": 2,
            "type": "CONTEXT",
            "text": "Paragraf kedua",
            "source_fact_id": null,
            "quote": null
        }}
    ],
    "word_count": 650,
    "label_stats": {{
        "FACT": 5,
        "CONTEXT": 3,
        "OPINI": 2
    }}
}}"""
    
    result_text = provider.generate(prompt, task="draft_generation", max_tokens=4096)
    
    try:
        data = json.loads(extract_json(result_text))
        if "word_count" not in data:
            data["word_count"] = len(data.get("content", "").split())
        if "label_stats" not in data:
            # Count from paragraphs
            stats = {"FACT": 0, "CONTEXT": 0, "OPINI": 0}
            for p in data.get("paragraphs", []):
                t = p.get("type", "CONTEXT")
                stats[t] = stats.get(t, 0) + 1
            data["label_stats"] = stats
        return data
    except json.JSONDecodeError:
        # Fallback jika JSON gagal
        word_count = len(result_text.split())
        return {
            "content": result_text,
            "word_count": word_count,
            "paragraphs": [],
            "label_stats": {},
            "raw_response": result_text
        }


# ══════════════════════════════════════════════════════════════════════════
# HTTP Handler (Vercel Serverless)
# ══════════════════════════════════════════════════════════════════════════

class handler(BaseHTTPRequestHandler):
    """Main serverless handler untuk stateless endpoints"""
    
    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_GET(self):
        """Handle GET requests"""
        if self.path == '/api/health':
            self.send_json_response(200, {
                "status": "ok",
                "message": "Stateless serverless backend running"
            })
        else:
            self.send_json_response(404, {"error": "Endpoint not found"})
    
    def do_POST(self):
        """Handle POST requests"""
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8')
        
        try:
            req = json.loads(body) if body else {}
        except json.JSONDecodeError:
            self.send_json_response(400, {"error": "Invalid JSON"})
            return
        
        path = self.path
        
        # Route handling
        if path == '/api/facts':
            self.handle_extract_facts(req)
        elif path == '/api/gap-analysis':
            self.handle_gap_analysis(req)
        elif path == '/api/draft':
            self.handle_generate_draft(req)
        else:
            self.send_json_response(404, {"error": f"Endpoint not found: {path}"})
    
    def handle_extract_facts(self, req):
        """Handle fact extraction"""
        article_text = req.get('article_text', '')
        if not article_text:
            self.send_json_response(400, {"error": "article_text required"})
            return
        
        try:
            result = extract_facts(article_text)
            self.send_json_response(200, {"status": "ok", "data": result})
        except Exception as e:
            self.send_json_response(500, {"error": str(e)})
    
    def handle_gap_analysis(self, req):
        """Handle gap analysis"""
        article_text = req.get('article_text', '')
        facts = req.get('facts', [])
        
        if not article_text:
            self.send_json_response(400, {"error": "article_text required"})
            return
        
        try:
            result = generate_gap_analysis(article_text, facts)
            self.send_json_response(200, {"status": "ok", "data": result})
        except Exception as e:
            self.send_json_response(500, {"error": str(e)})
    
    def handle_generate_draft(self, req):
        """Handle draft generation"""
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
