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
    """Multi-provider AI adapter untuk Groq → Gemini → OpenRouter fallback"""
    
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


def generate_draft(angle_title: str, article_title: str, facts: List[Dict]) -> Dict:
    """Generate draft artikel berlabel [FACT/CONTEXT/OPINI]"""
    provider = AIProvider()
    
    facts_text = "\n".join([f"- {f.get('text', '')}" for f in facts])
    
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

Format respons sebagai JSON (tanpa markdown):
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
    
    result_text = provider.generate(prompt, max_tokens=4096)
    
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
