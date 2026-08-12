"""
Serverless Function: Gap Analysis & Angle Mapping
Endpoint: /api/gap-analysis
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


def generate_gap_analysis(article_text: str, facts: List[Dict]) -> Dict:
    """Analisis gap dan generate 3 angles"""
    provider = AIProvider()
    
    facts_text = "\n".join([f"- {f.get('text', '')}" for f in facts])
    
    prompt = f"""Berdasarkan artikel dan fakta berikut, identifikasi gap editorial dan buat 3 sudut pandang (angle) berita yang berbeda.

Artikel:
{article_text}

Fakta yang tersedia:
{facts_text}

Berikan respons HANYA sebagai JSON (tanpa markdown):
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
    
    result_text = provider.generate(prompt, max_tokens=2048)
    
    try:
        return json.loads(extract_json(result_text))
    except json.JSONDecodeError:
        return {"gaps": [], "angles": [], "analysis_notes": "", "raw_response": result_text}


class handler(BaseHTTPRequestHandler):
    """Serverless handler untuk gap analysis"""
    
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
    
    def send_json_response(self, status_code, data):
        """Send JSON response dengan CORS headers"""
        self.send_response(status_code)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
