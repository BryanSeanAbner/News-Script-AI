"""
Serverless Function: Generate Title Recommendations
Endpoint: /api/titles
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
    
    def generate(self, prompt: str, max_tokens: int = 2048) -> str:
        """Generate text menggunakan multi-provider fallback"""
        
        # Try Groq first
        if self.groq_key and Groq:
            try:
                client = Groq(api_key=self.groq_key)
                response = client.chat.completions.create(
                    model="GPT OSS 120B",
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


def generate_titles(angle_title: str, angle_hook: str, facts: List[Dict]) -> Dict:
    """Generate 5 rekomendasi judul dari angle"""
    provider = AIProvider()
    
    facts_text = "\n".join([f"- {f.get('text', '')}" for f in facts[:10]])  # Top 10 facts only
    
    prompt = f"""Berdasarkan angle berita berikut, buatkan 5 rekomendasi judul artikel yang menarik dan SEO-friendly.

Angle: {angle_title}
Hook: {angle_hook}

Fakta pendukung:
{facts_text}

Berikan respons HANYA sebagai JSON (tanpa markdown):
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
        {{
            "id": "title_2",
            "text": "Judul Kedua",
            "style": "provocative",
            "seo_score": 0.85,
            "char_count": 45,
            "notes": "..."
        }},
        {{
            "id": "title_3",
            "text": "Judul Ketiga",
            "style": "analytical",
            "seo_score": 0.88,
            "char_count": 52,
            "notes": "..."
        }},
        {{
            "id": "title_4",
            "text": "Judul Keempat",
            "style": "empathetic",
            "seo_score": 0.82,
            "char_count": 48,
            "notes": "..."
        }},
        {{
            "id": "title_5",
            "text": "Judul Kelima",
            "style": "urgent",
            "seo_score": 0.86,
            "char_count": 46,
            "notes": "..."
        }}
    ]
}}

Buat 5 variasi judul dengan style berbeda: informative, provocative, analytical, empathetic, urgent.
Setiap judul harus:
- Maksimal 60 karakter
- SEO-friendly (keyword di awal)
- Menarik perhatian pembaca"""
    
    result_text = provider.generate(prompt, max_tokens=1024)
    
    try:
        data = json.loads(extract_json(result_text))
        # Ensure char_count for each title
        for title in data.get("titles", []):
            if "char_count" not in title:
                title["char_count"] = len(title.get("text", ""))
        return data
    except json.JSONDecodeError:
        return {"titles": [], "raw_response": result_text}


class handler(BaseHTTPRequestHandler):
    """Serverless handler untuk title generation"""
    
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
        angle_hook = req.get('angle_hook', '')
        facts = req.get('facts', [])
        
        if not angle_title:
            self.send_json_response(400, {"error": "angle_title required"})
            return
        
        try:
            result = generate_titles(angle_title, angle_hook, facts)
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
