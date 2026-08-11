"""
Step 2 — Fact Extraction (Gemini Flash)
Ekstrak fakta terstruktur dari artikel referensi.
"""

import logging
from datetime import datetime, timezone
from adapters.base import BaseAIAdapter
from utils.json_validator import safe_parse_llm_json

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Kamu adalah asisten ekstraksi fakta untuk jurnalis profesional.
Tugasmu adalah mengekstrak fakta-fakta penting dari artikel yang diberikan.
ATURAN KRITIS:
- Hanya ekstrak fakta yang TERSURAT dalam teks artikel. Jangan tambah informasi dari pengetahuan umum.
- Setiap fakta harus berupa kalimat tunggal yang jelas.
- Respond ONLY with valid JSON. No markdown, no explanation."""

PROMPT_TEMPLATE = """Artikel untuk dianalisis:
---
JUDUL: {title}

ISI:
{body}
---

Ekstrak semua fakta penting dari artikel di atas. Hasilkan JSON dengan format berikut:
{{
  "facts": [
    {{
      "id": "fact_001",
      "claim": "Pernyataan fakta dalam satu kalimat",
      "category": "who|what|when|where|why|how|statistic|quote",
      "entities": ["Nama entitas yang terlibat"],
      "temporal": "Waktu/tanggal yang relevan (atau null)",
      "source_sentence": "Kalimat asli dari artikel",
      "confidence": 0.95
    }}
  ],
  "entity_map": {{
    "Nama Entitas": ["fact_001", "fact_002"]
  }},
  "summary": "Ringkasan artikel dalam 2-3 kalimat",
  "total_facts": 0
}}

Gunakan format ID: fact_001, fact_002, dst.
Tulis semua output dalam Bahasa Indonesia."""


async def run(session: dict, adapter: BaseAIAdapter) -> dict:
    """Jalankan Step 2: Fact Extraction."""
    step1 = session["data"]["step_1"]
    prompt = PROMPT_TEMPLATE.format(
        title=step1["title"],
        body=step1["body"],
    )

    raw = await adapter.generate(prompt, system_prompt=SYSTEM_PROMPT)
    data = safe_parse_llm_json(raw, required_keys=["facts"], context="Step2")

    # Normalisasi & Fallback Defaults
    facts = data.get("facts", [])
    if not isinstance(data.get("entity_map"), dict):
        data["entity_map"] = {}
    if not data.get("summary"):
        data["summary"] = f"Ringkasan ekstraksi {len(facts)} fakta utama dari artikel."

    data["total_facts"] = len(facts)
    data["model_used"] = adapter.provider_name
    data["extracted_at"] = datetime.now(timezone.utc).isoformat()

    logger.info(f"Step 2 complete: {len(facts)} facts extracted")
    return data
