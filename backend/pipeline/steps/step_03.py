"""
Step 3 — Gap Analysis & Angle Mapping (Groq Cloud)
Identifikasi gap editorial DAN petakan 3 angle berita sekaligus dalam Step 3.
"""

import logging
from datetime import datetime, timezone
from adapters.base import BaseAIAdapter
from utils.config import settings
from utils.json_validator import safe_parse_llm_json

logger = logging.getLogger(__name__)

GAP_SYSTEM_PROMPT = """Kamu adalah analis editorial senior untuk media berita profesional.
Tugasmu adalah mengidentifikasi "gap" — sudut pandang, konteks, atau informasi penting 
yang TIDAK dibahas dalam artikel referensi, namun relevan dan penting untuk diangkat.
Respond ONLY with valid JSON. No markdown, no explanation."""

GAP_PROMPT_TEMPLATE = """Artikel referensi telah menghasilkan fakta-fakta berikut:

RINGKASAN ARTIKEL: {summary}

FAKTA YANG ADA ({total_facts} fakta):
{facts_text}

Identifikasi gap — sudut atau informasi yang TIDAK dibahas artikel ini namun penting.
Hasilkan tepat {gap_count} gap teratas dengan format JSON:
{{
  "gaps": [
    {{
      "id": "gap_001",
      "title": "Pertanyaan/sudut yang belum terjawab",
      "description": "Mengapa ini penting dan belum dibahas",
      "relevance_score": 0.92,
      "gap_type": "missing_context|unexplored_angle|follow_up|counter_perspective|impact_analysis|human_interest",
      "supporting_fact_ids": ["fact_001"],
      "potential_sources": ["Sumber yang bisa mengisi gap ini"]
    }}
  ],
  "top_gaps": ["gap_001", "gap_002", "gap_003"],
  "analysis_notes": "Catatan tentang pola gap yang ditemukan"
}}

PENTING: "top_gaps" harus berisi tepat {gap_count} gap ID.
Tulis semua output dalam Bahasa Indonesia."""

ANGLE_SYSTEM_PROMPT = """Kamu adalah editor senior dan kepala redaksi di media berita profesional.
Tugasmu adalah mengubah gap editorial menjadi angle berita yang konkret dan menarik.
Setiap angle harus memiliki hook yang kuat dan struktur yang jelas.
Respond ONLY with valid JSON."""

ANGLE_PROMPT_TEMPLATE = """Kamu memiliki {total_facts} fakta dari artikel referensi dan {gap_count} gap editorial.

FAKTA TERSEDIA:
{facts_text}

TOP {gap_count} GAP EDITORIAL:
{gaps_text}

Petakan SETIAP gap menjadi satu angle berita yang konkret. Hasilkan JSON dengan TEPAT {gap_count} angle:
{{
  "angles": [
    {{
      "id": "angle_001",
      "gap_id": "gap_001",
      "angle_title": "Framing/judul angle berita",
      "angle_hook": "Lead/kalimat pembuka yang kuat dan menarik untuk angle ini",
      "angle_type": "investigative|explainer|opinion|feature|breaking|analysis|human_interest",
      "suggested_structure": [
        {{
          "order": 1,
          "subtitle": "Sub-topik pertama",
          "key_facts": ["fact_001", "fact_002"]
        }}
      ],
      "target_audience": "Deskripsi target pembaca",
      "estimated_word_count": 800,
      "supporting_fact_ids": ["fact_001", "fact_003"],
      "tone": "neutral|critical|empathetic|informative|persuasive"
    }}
  ]
}}

PENTING: Tulis semua teks dalam Bahasa Indonesia."""


async def run(session: dict, adapter: BaseAIAdapter) -> dict:
    """Jalankan Step 3: Gap Analysis & Angle Mapping."""
    step2 = session["data"]["step_2"]
    gap_count = settings.PIPELINE_GAP_COUNT

    facts_text = "\n".join([
        f"- [{f['id']}] ({f['category']}) {f['claim']}"
        for f in step2.get("facts", [])
    ])

    # Call 1: Gap Analysis
    gap_prompt = GAP_PROMPT_TEMPLATE.format(
        summary=step2.get("summary", ""),
        total_facts=step2.get("total_facts", 0),
        facts_text=facts_text,
        gap_count=gap_count,
    )
    raw_gap = await adapter.generate(gap_prompt, system_prompt=GAP_SYSTEM_PROMPT)
    gap_data = safe_parse_llm_json(raw_gap, required_keys=["gaps", "top_gaps"], context="Step3_Gap")

    gaps = gap_data.get("gaps", [])
    top_gap_ids = gap_data.get("top_gaps", [])[:gap_count]
    all_gaps = {g["id"]: g for g in gaps}
    top_gaps = [all_gaps[gid] for gid in top_gap_ids if gid in all_gaps]

    gaps_text = "\n".join([
        f"- [{g['id']}] {g['title']}: {g['description'][:150]}..."
        for g in top_gaps
    ])

    # Call 2: Angle Mapping (Otomatis langsung setelah Gap Analysis)
    angle_prompt = ANGLE_PROMPT_TEMPLATE.format(
        total_facts=step2.get("total_facts", 0),
        gap_count=gap_count,
        facts_text=facts_text,
        gaps_text=gaps_text,
    )
    raw_angle = await adapter.generate(angle_prompt, system_prompt=ANGLE_SYSTEM_PROMPT)
    angle_data = safe_parse_llm_json(raw_angle, required_keys=["angles"], context="Step3_Angle")

    angles = angle_data.get("angles", [])

    result = {
        "gaps": gaps,
        "top_gaps": top_gap_ids,
        "analysis_notes": gap_data.get("analysis_notes", ""),
        "angles": angles,
        "model_used": adapter.provider_name,
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
    }

    logger.info(f"Step 3 complete: {len(gaps)} gaps found, {len(angles)} angles mapped")
    return result
