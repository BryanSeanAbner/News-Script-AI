"""
Serverless Function untuk AI Generation
Menggabungkan logic dari backend steps (fact extraction, gap analysis, draft generation, grounding check)
"""

import json
import os
from http.server import BaseHTTPRequestHandler
from typing import Optional
import sys

# Add path untuk import modules
sys.path.insert(0, '/var/task')

# Multi-provider adapter
from groq import Groq
import google.generativeai as genai
from openai import OpenAI


class AIProvider:
    """Multi-provider AI adapter untuk Groq → Gemini → OpenRouter fallback"""
    
    def __init__(self):
        self.groq_key = os.getenv('GROK_API_KEY', '')
        self.gemini_key = os.getenv('GEMINI_API_KEY', '')
        self.openrouter_key = os.getenv('OPENROUTER_API_KEY', '')
    
    def generate(self, prompt: str, task: str = "default", max_tokens: int = 4096) -> Optional[str]:
        """Generate text menggunakan multi-provider fallback"""
        
        # Try Groq first
        if self.groq_key:
            try:
                client = Groq(api_key=self.groq_key)
                response = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=min(max_tokens, 4096),
                    temperature=0.3
                )
                return response.choices[0].message.content
            except Exception as e:
                print(f"Groq failed: {e}")
        
        # Fallback ke Gemini
        if self.gemini_key:
            try:
                genai.configure(api_key=self.gemini_key)
                model = genai.GenerativeModel("gemini-2.5-flash")
                response = model.generate_content(prompt)
                return response.text
            except Exception as e:
                print(f"Gemini failed: {e}")
        
        # Fallback ke OpenRouter
        if self.openrouter_key:
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


def extract_facts(article_text: str) -> dict:
    """Extract facts dari artikel"""
    provider = AIProvider()
    
    prompt = f"""Analisis artikel berikut dan ekstrak faktanya sebagai JSON:

Artikel:
{article_text}

Berikan respons HANYA sebagai JSON (tanpa markdown), dengan format:
{{
    "facts": [
        {{"id": "fact_1", "text": "...", "source": "..."}},
        {{"id": "fact_2", "text": "...", "source": "..."}}
    ],
    "total_facts": 2
}}"""
    
    result_text = provider.generate(prompt, task="fact_extraction", max_tokens=2048)
    
    # Parse JSON response
    try:
        # Handle potential markdown code blocks
        if "```json" in result_text:
            result_text = result_text.split("```json")[1].split("```")[0]
        elif "```" in result_text:
            result_text = result_text.split("```")[1].split("```")[0]
        
        return json.loads(result_text.strip())
    except json.JSONDecodeError:
        return {"facts": [], "total_facts": 0, "raw_response": result_text}


def generate_gap_analysis(article_text: str, facts: list) -> dict:
    """Analisis gap dan generate angles"""
    provider = AIProvider()
    
    facts_text = "\n".join([f"- {f['text']}" for f in facts])
    
    prompt = f"""Berdasarkan artikel dan fakta berikut, identifikasi gap dan buat 3 sudut pandang (angle):

Artikel:
{article_text}

Fakta yang ada:
{facts_text}

Berikan respons HANYA sebagai JSON:
{{
    "gaps": ["gap_1", "gap_2"],
    "angles": [
        {{"id": "angle_1", "title": "...", "description": "..."}},
        {{"id": "angle_2", "title": "...", "description": "..."}},
        {{"id": "angle_3", "title": "...", "description": "..."}}
    ]
}}"""
    
    result_text = provider.generate(prompt, task="gap_analysis", max_tokens=2048)
    
    try:
        if "```json" in result_text:
            result_text = result_text.split("```json")[1].split("```")[0]
        elif "```" in result_text:
            result_text = result_text.split("```")[1].split("```")[0]
        
        return json.loads(result_text.strip())
    except json.JSONDecodeError:
        return {"gaps": [], "angles": [], "raw_response": result_text}


def generate_draft(angle_description: str, article_title: str, facts: list) -> dict:
    """Generate draft artikel"""
    provider = AIProvider()
    
    facts_text = "\n".join([f"- {f['text']}" for f in facts])
    
    prompt = f"""Tulis draft artikel berita berdasarkan:

Judul: {article_title}
Sudut Pandang: {angle_description}
Fakta yang ada:
{facts_text}

Format respons sebagai JSON:
{{
    "content": "isi artikel dengan paragraf berlabel [FACT], [CONTEXT], [OPINI]",
    "word_count": 500,
    "paragraphs": [
        {{"order": 1, "type": "FACT", "text": "..."}},
        {{"order": 2, "type": "CONTEXT", "text": "..."}}
    ]
}}"""
    
    result_text = provider.generate(prompt, task="draft_generation", max_tokens=4096)
    
    try:
        if "```json" in result_text:
            result_text = result_text.split("```json")[1].split("```")[0]
        elif "```" in result_text:
            result_text = result_text.split("```")[1].split("```")[0]
        
        data = json.loads(result_text.strip())
        if "word_count" not in data:
            data["word_count"] = len(data.get("content", "").split())
        return data
    except json.JSONDecodeError:
        return {"content": result_text, "word_count": len(result_text.split()), "paragraphs": []}


class handler(BaseHTTPRequestHandler):
    """Main serverless handler"""
    
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
            self.handle_facts(req)
        elif path == '/api/gap-analysis':
            self.handle_gap_analysis(req)
        elif path == '/api/draft':
            self.handle_draft(req)
        else:
            self.send_json_response(404, {"error": "Endpoint not found"})
    
    def do_GET(self):
        """Handle GET requests"""
        if self.path == '/api/health':
            self.send_json_response(200, {"status": "ok", "message": "Serverless backend running"})
        else:
            self.send_json_response(404, {"error": "Endpoint not found"})
    
    def handle_facts(self, req):
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
        
        if not article_text or not facts:
            self.send_json_response(400, {"error": "article_text and facts required"})
            return
        
        try:
            result = generate_gap_analysis(article_text, facts)
            self.send_json_response(200, {"status": "ok", "data": result})
        except Exception as e:
            self.send_json_response(500, {"error": str(e)})
    
    def handle_draft(self, req):
        """Handle draft generation"""
        angle_description = req.get('angle_description', '')
        article_title = req.get('article_title', '')
        facts = req.get('facts', [])
        
        if not all([angle_description, article_title, facts]):
            self.send_json_response(400, {"error": "angle_description, article_title, facts required"})
            return
        
        try:
            result = generate_draft(angle_description, article_title, facts)
            self.send_json_response(200, {"status": "ok", "data": result})
        except Exception as e:
            self.send_json_response(500, {"error": str(e)})
    
    def send_json_response(self, status_code, data):
        """Send JSON response"""
        self.send_response(status_code)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
