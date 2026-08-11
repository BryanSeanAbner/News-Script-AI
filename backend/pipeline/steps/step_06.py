"""
Step 6 Helper — Title Generation (Groq Cloud)
Generate opsi judul SEO dari angle terpilih.
"""

import logging
from datetime import datetime, timezone
from adapters.base import BaseAIAdapter
from utils.config import settings
from utils.json_validator import safe_parse_llm_json

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Kamu adalah copywriter dan SEO specialist untuk media berita digital.
Tugasmu membuat judul artikel yang menarik, informatif, dan ramah SEO.
Respond ONLY with valid JSON. No markdown, no explanation."""

PROMPT_TEMPLATE = """Buat {title_count} opsi judul artikel berita berdasarkan angle berikut:

ANGLE TERPILIH:
- Judul Angle: {angle_title}
- Hook: {angle_hook}
- Tipe: {angle_type}
- Target Pembaca: {target_audience}

FAKTA KUNCI:
{key_facts_text}

TOPIK: {topic}

Hasilkan JSON dengan {title_count} opsi judul:
{{
  "titles": [
    {{
      "id": "title_001",
      "text": "Judul artikel (max 120 karakter)",
      "seo_score": 0.88,
      "style": "question|how_to|listicle|statement|news_lead|provocative",
      "char_count": 85,
      "keywords": ["kata kunci 1", "kata kunci 2"],
      "notes": "Alasan mengapa judul ini efektif"
    }}
  ],
  "primary_keyword": "kata kunci utama"
}}

ATURAN JUDUL:
- Maksimal 120 karakter
- Gunakan kata kunci yang relevan
- Variasikan style antar opsi
- Semua judul dalam Bahasa Indonesia"""


async def generate_titles_for_angle(session: dict, selected_angle_id: str, adapter: BaseAIAdapter) -> dict:
    """Generate rekomendasi judul untuk angle terpilih."""
    step2 = session["data"]["step_2"]
    step3 = session["data"]["step_3"]
    step1 = session["data"]["step_1"]

    angles = {a["id"]: a for a in step3.get("angles", [])}
    angle = angles.get(selected_angle_id, {})

    all_facts = {f["id"]: f for f in step2.get("facts", [])}
    key_fact_ids = angle.get("supporting_fact_ids", [])[:5]
    key_facts_text = "\n".join([
        f"- {all_facts[fid]['claim']}"
        for fid in key_fact_ids if fid in all_facts
    ])

    topic = (step1.get("metadata") or {}).get("topic", "Berita")
    title_count = settings.PIPELINE_TITLE_COUNT

    prompt = PROMPT_TEMPLATE.format(
        title_count=title_count,
        angle_title=angle.get("angle_title", ""),
        angle_hook=angle.get("angle_hook", ""),
        angle_type=angle.get("angle_type", ""),
        target_audience=angle.get("target_audience", ""),
        key_facts_text=key_facts_text,
        topic=topic,
    )

    raw = await adapter.generate(prompt, system_prompt=SYSTEM_PROMPT)
    data = safe_parse_llm_json(raw, required_keys=["titles"], context="TitleGen")

    data["selected_angle_id"] = selected_angle_id
    data["model_used"] = adapter.provider_name
    data["generated_at"] = datetime.now(timezone.utc).isoformat()

    return data
