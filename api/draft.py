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

PENTING: Respons harus berupa JSON lengkap dan valid. Jangan potong di tengah.

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
    
    result_text = provider.generate(prompt, max_tokens=8000)
    
    try:
        data = json.loads(extract_json(result_text))
        
        # Ensure word_count
        if "word_count" not in data:
            data["word_count"] = len(data.get("content", "").split())
        
        # Ensure label_stats dari paragraphs
        if "label_stats" not in data and data.get("paragraphs"):
            stats = {"FACT": 0, "CONTEXT": 0, "OPINI": 0}
            for p in data.get("paragraphs", []):
                t = p.get("type", "CONTEXT")
                stats[t] = stats.get(t, 0) + 1
            data["label_stats"] = stats
        
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
