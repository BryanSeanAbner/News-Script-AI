"""
Serverless Function: Fact Extraction
Endpoint: /api/facts
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
    
    result_text = provider.generate(prompt, max_tokens=2048)
    
    try:
        return json.loads(extract_json(result_text))
    except json.JSONDecodeError:
        return {"facts": [], "total_facts": 0, "summary": "", "raw_response": result_text}


class handler(BaseHTTPRequestHandler):
    """Serverless handler untuk fact extraction"""
    
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
        if not article_text:
            self.send_json_response(400, {"error": "article_text required"})
            return
        
        try:
            result = extract_facts(article_text)
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
