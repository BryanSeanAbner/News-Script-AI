"""
Serverless Function: Grounding Check
Endpoint: /api/grounding
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


def check_grounding(draft_content: str, facts: List[Dict]) -> Dict:
    """Verifikasi grounding score artikel vs fakta"""
    provider = AIProvider()
    
    facts_text = "\n".join([f"[{f.get('id', '')}] {f.get('text', '')}" for f in facts])
    
    prompt = f"""Verifikasi setiap klaim dalam draft artikel berikut terhadap fakta yang tersedia.

Draft Artikel:
{draft_content}

Fakta Referensi:
{facts_text}

Analisis setiap klaim dan berikan grounding score (0.0-1.0).

Format respons sebagai JSON (tanpa markdown):
{{
    "grounding_score": 0.85,
    "total_claims": 15,
    "grounded_claims": 13,
    "ungrounded_claims": [
        {{
            "claim_text": "Klaim yang tidak ter-ground",
            "severity": "minor",
            "suggestion": "Saran perbaikan"
        }}
    ],
    "claim_evidence_map": [
        {{
            "claim_text": "Klaim pertama",
            "is_grounded": true,
            "supporting_fact_ids": ["fact_1", "fact_2"],
            "confidence": 0.95
        }},
        {{
            "claim_text": "Klaim kedua",
            "is_grounded": false,
            "supporting_fact_ids": [],
            "confidence": 0.3
        }}
    ],
    "status": "PASS",
    "recommendation": "Artikel lolos grounding check dengan skor 85%"
}}

Status rules:
- PASS: grounding_score > 0.8 (>80%)
- WARN: grounding_score 0.6-0.8 (60-80%)
- FAIL: grounding_score < 0.6 (<60%)

Severity levels untuk ungrounded_claims:
- critical: Klaim faktual yang salah atau menyesatkan
- major: Klaim yang belum terverifikasi namun penting
- minor: Klaim sekunder yang perlu validasi"""
    
    result_text = provider.generate(prompt, max_tokens=2048)
    
    try:
        data = json.loads(extract_json(result_text))
        
        # Ensure all required fields exist
        if "grounding_score" not in data:
            data["grounding_score"] = 0.0
        
        if "status" not in data:
            score = data["grounding_score"]
            data["status"] = "PASS" if score > 0.8 else ("WARN" if score > 0.6 else "FAIL")
        
        if "total_claims" not in data:
            data["total_claims"] = len(data.get("claim_evidence_map", []))
        
        if "grounded_claims" not in data:
            data["grounded_claims"] = sum(
                1 for c in data.get("claim_evidence_map", []) if c.get("is_grounded", False)
            )
        
        if "ungrounded_claims" not in data:
            data["ungrounded_claims"] = []
        
        if "claim_evidence_map" not in data:
            data["claim_evidence_map"] = []
        
        if "recommendation" not in data:
            score = data["grounding_score"]
            status = data["status"]
            data["recommendation"] = (
                f"Artikel {'lolos' if status == 'PASS' else 'perlu revisi'} "
                f"dengan grounding score {int(score * 100)}%"
            )
        
        return data
    except json.JSONDecodeError:
        return {
            "grounding_score": 0.0,
            "total_claims": 0,
            "grounded_claims": 0,
            "ungrounded_claims": [],
            "claim_evidence_map": [],
            "status": "ERROR",
            "recommendation": "Gagal parsing grounding check",
            "raw_response": result_text
        }


class handler(BaseHTTPRequestHandler):
    """Serverless handler untuk grounding check"""
    
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
        
        draft_content = req.get('draft_content', '')
        facts = req.get('facts', [])
        
        if not draft_content:
            self.send_json_response(400, {"error": "draft_content required"})
            return
        
        try:
            result = check_grounding(draft_content, facts)
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
