"""
Step 6 — Grounding Check (Groq Cloud)
Verifikasi setiap klaim draft vs JSON fakta dari Step 2.
"""

import logging
from datetime import datetime, timezone
from adapters.base import BaseAIAdapter
from utils.config import settings
from utils.json_validator import safe_parse_llm_json

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Kamu adalah fact-checker dan verifikator konten untuk media berita profesional.
Tugasmu adalah memeriksa apakah setiap klaim dalam draft artikel memiliki dukungan faktual
dari daftar fakta yang disediakan.
Respond ONLY with valid JSON. No markdown, no explanation."""

PROMPT_TEMPLATE = """Verifikasi klaim dalam draft artikel berikut terhadap daftar fakta yang tersedia.

DAFTAR FAKTA TERVERIFIKASI ({total_facts} fakta):
{facts_text}

DRAFT ARTIKEL:
---
{draft_content}
---

Identifikasi setiap klaim faktual dalam draft dan periksa apakah ada dukungannya di daftar fakta.

Hasilkan JSON verifikasi:
{{
  "total_claims": 15,
  "grounded_claims": 13,
  "grounding_score": 0.87,
  "status": "PASS",
  "ungrounded_claims": [
    {{
      "claim_text": "Klaim yang tidak ada dukungannya",
      "severity": "critical|major|minor",
      "suggestion": "Saran perbaikan"
    }}
  ],
  "claim_evidence_map": [
    {{
      "claim_text": "Klaim dari draft",
      "is_grounded": true,
      "supporting_fact_ids": ["fact_001"],
      "confidence": 0.95
    }}
  ],
  "recommendation": "Deskripsi rekomendasi: lanjut/revisi minor/revisi major"
}}

ATURAN SCORING:
- grounding_score = grounded_claims / total_claims
- status = "PASS" jika score >= {threshold_pass}
- status = "WARN" jika score >= {threshold_warn} 
- status = "FAIL" jika score < {threshold_warn}

Tulis semua teks dalam Bahasa Indonesia."""


async def run(session: dict, adapter: BaseAIAdapter) -> dict:
    """Jalankan Step 6: Grounding Check."""
    step2 = session["data"]["step_2"]
    step5 = session["data"]["step_5"]  # Draft Generation is now step 5

    facts = step2.get("facts", [])
    facts_text = "\n".join([
        f"[{f['id']}] ({f['category']}) {f['claim']}"
        for f in facts
    ])

    draft_content = step5.get("content", "")

    prompt = PROMPT_TEMPLATE.format(
        total_facts=len(facts),
        facts_text=facts_text,
        draft_content=draft_content[:8000],
        threshold_pass=settings.GROUNDING_THRESHOLD_PASS,
        threshold_warn=settings.GROUNDING_THRESHOLD_WARN,
    )

    raw = await adapter.generate(prompt, system_prompt=SYSTEM_PROMPT)
    data = safe_parse_llm_json(
        raw,
        required_keys=["grounding_score", "status", "total_claims", "grounded_claims"],
        context="Step6_Grounding"
    )

    score = data.get("grounding_score", 0)
    if score < settings.GROUNDING_THRESHOLD_WARN:
        data["status"] = "FAIL"
        data["trigger_loop"] = "LOOP_SMALL"
        logger.warning(f"Step 6 FAIL: score={score:.2f} < threshold {settings.GROUNDING_THRESHOLD_WARN}")
    elif score < settings.GROUNDING_THRESHOLD_PASS:
        data["status"] = "WARN"
        data["trigger_loop"] = None
        logger.warning(f"Step 6 WARN: score={score:.2f}")
    else:
        data["status"] = "PASS"
        data["trigger_loop"] = None
        logger.info(f"Step 6 PASS: score={score:.2f}")

    data["model_used"] = adapter.provider_name
    data["checked_at"] = datetime.now(timezone.utc).isoformat()

    return data
