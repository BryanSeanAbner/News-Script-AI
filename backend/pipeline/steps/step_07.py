"""
Step 5 — Draft Generation (Groq Cloud Llama 3.3 70B)
Generate draft artikel jurnalistik panjang (1000-1500 kata) dengan paragraf berlabel [FACT/CONTEXT/OPINI].
"""

import logging
from datetime import datetime, timezone
from adapters.base import BaseAIAdapter
from utils.json_validator import safe_parse_llm_json

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Kamu adalah jurnalis investigatif profesional senior yang menulis artikel berita berkualitas tinggi untuk media nasional.

ATURAN KRITIS — GROUNDING & LABELING:
1. Setiap paragraf WAJIB memiliki label TYPE: "FACT", "CONTEXT", atau "OPINI"
   - FACT: Klaim langsung dari fakta yang diberikan, sertakan kutipan verbatim dari source_sentence
   - CONTEXT: Penjelasan latar belakang yang dihasilkan AI (perlu validasi redaksi)
   - OPINI: Interpretasi/analisis yang dihasilkan AI (perlu konfirmasi penulis/editor)
2. Paragraf bertipe FACT HARUS menyertakan field "quote" dari source_sentence fakta
3. Paragraf bertipe FACT HARUS menyertakan "source_fact_id" yang valid
4. Tulis dalam gaya jurnalistik Indonesia yang tajam, padat, dan berkualitas
5. Panjang artikel: 1000-1500 kata minimum

Respond ONLY with valid JSON. No markdown code blocks."""

PROMPT_TEMPLATE = """Tulis artikel berita investigatif berdasarkan data berikut.

JUDUL: {title}

ANGLE:
- Framing: {angle_title}
- Hook (Lead): {angle_hook}
- Tipe: {angle_type}
- Tone: {tone}
- Target: {target_audience}

STRUKTUR YANG DISARANKAN:
{structure_text}

{revision_context}

FAKTA YANG TERSEDIA ({total_facts} fakta) — WAJIB gunakan semua atau sebagian besar:
{facts_text}

Hasilkan artikel jurnalistik PANJANG (1000-1500 kata) dalam format JSON:
{{
  "title": "{title}",
  "paragraphs": [
    {{
      "order": 1,
      "type": "FACT",
      "text": "Teks paragraf faktual berdasarkan fakta tertentu...",
      "source_fact_id": "fact_001",
      "quote": "Kutipan verbatim dari source_sentence fakta tersebut"
    }},
    {{
      "order": 2,
      "type": "CONTEXT",
      "text": "Paragraf konteks latar belakang yang dihasilkan AI...",
      "source_fact_id": null,
      "quote": null
    }},
    {{
      "order": 3,
      "type": "OPINI",
      "text": "Paragraf analisis/interpretasi yang dihasilkan AI...",
      "source_fact_id": null,
      "quote": null
    }}
  ],
  "sections": [
    {{
      "order": 1,
      "heading": "Sub-judul seksi",
      "paragraph_orders": [1, 2, 3]
    }}
  ],
  "word_count": 1200,
  "grounding_constraint": {{
    "constraint_applied": true,
    "fact_ids_used": ["fact_001", "fact_002"],
    "fact_count_available": {total_facts}
  }}
}}

PENTING:
- Mulai artikel dengan paragraf FACT yang kuat sebagai lead
- Selingi FACT, CONTEXT, dan OPINI secara natural untuk narasi yang mengalir
- Setiap klaim faktual penting HARUS berpasangan dengan paragraf FACT + quote
- Minimum 8-12 paragraf total
- fact_ids_used harus berisi semua fact_id yang benar-benar dipakai"""


async def run(session: dict, adapter: BaseAIAdapter) -> dict:
    """Jalankan Step 5: Draft Generation."""
    step2 = session["data"]["step_2"]
    step3 = session["data"]["step_3"]
    step4 = session["data"]["step_4"]
    step7 = session["data"].get("step_7")  # Revision context if LOOP_SMALL

    selected_id = step4.get("selected_angle_id")
    angles = {a["id"]: a for a in step3.get("angles", [])}
    angle = angles.get(selected_id, {})

    title = step4.get("selected_title") or angle.get("angle_title", "")

    structure = angle.get("suggested_structure", [])
    structure_text = "\n".join([
        f"{s['order']}. {s['subtitle']}"
        for s in sorted(structure, key=lambda x: x.get("order", 0))
    ]) if structure else "Tentukan struktur yang paling efektif untuk angle ini."

    facts = step2.get("facts", [])
    total_facts = len(facts)
    facts_text = "\n".join([
        f"[{f['id']}] ({f['category']}) {f['claim']}\n   → Kutipan: \"{f.get('source_sentence', '')}\"\n   → Entitas: {', '.join(f.get('entities', []))}"
        for f in facts
    ])

    revision_context = ""
    revision_number = 0
    editor_notes = ""
    if session.get("revision_loop") == "LOOP_SMALL" and step7:
        revision_number = session["revision_count"]["small"]
        editor_notes = step7.get("editor_notes", "")
        revision_context = f"""KONTEKS REVISI (Revisi #{revision_number}):
Catatan editor: {editor_notes}
Perbaiki draft sesuai catatan editor. Pertahankan struktur paragraf berlabel."""

    prompt = PROMPT_TEMPLATE.format(
        title=title,
        angle_title=angle.get("angle_title", ""),
        angle_hook=angle.get("angle_hook", ""),
        angle_type=angle.get("angle_type", ""),
        tone=angle.get("tone", "neutral"),
        target_audience=angle.get("target_audience", "Pembaca umum"),
        structure_text=structure_text,
        revision_context=revision_context,
        total_facts=total_facts,
        facts_text=facts_text,
    )

    raw = await adapter.generate(
        prompt,
        system_prompt=SYSTEM_PROMPT,
        temperature=0.5,
        max_tokens=8000,
    )
    data = safe_parse_llm_json(raw, required_keys=["title", "paragraphs", "grounding_constraint"], context="Step5_Draft")

    paragraphs = data.get("paragraphs", [])

    content_parts = []
    for p in paragraphs:
        content_parts.append(p.get("text", ""))
        if p.get("quote"):
            content_parts.append(f'*"{p["quote"]}"*')

    data["content"] = "\n\n".join(content_parts)
    data["word_count"] = len(data["content"].split())

    label_counts = {"FACT": 0, "CONTEXT": 0, "OPINI": 0}
    for p in paragraphs:
        t = p.get("type", "CONTEXT")
        label_counts[t] = label_counts.get(t, 0) + 1
    data["label_stats"] = label_counts

    if revision_number > 0:
        data["revision_context"] = {
            "is_revision": True,
            "revision_number": revision_number,
            "editor_notes": editor_notes,
        }
    else:
        data["revision_context"] = None

    data["model_used"] = adapter.provider_name
    data["generated_at"] = datetime.now(timezone.utc).isoformat()

    logger.info(f"Step 5 Draft complete: {data['word_count']} words, {len(paragraphs)} paragraphs")
    return data
