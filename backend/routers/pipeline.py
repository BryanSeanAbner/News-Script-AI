"""
Pipeline Router — 8-step pipeline endpoint
"""

import logging
import re
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from storage.session_store import load_session, save_session, save_published
from pipeline.step_runner import run_step
from pipeline.steps.step_06 import generate_titles_for_angle
from adapters.multi_provider import get_ai_adapter

logger = logging.getLogger(__name__)
router = APIRouter()


# ─── Request Models ───────────────────────────────────────────────────────────

class Step1Request(BaseModel):
    title: str
    body: str
    sources: list[dict]
    metadata: dict | None = None


class Step4AngleSelectRequest(BaseModel):
    selected_angle_id: str


class Step4TitleSelectRequest(BaseModel):
    selected_title_id: str | None = None
    custom_title: str | None = None


class Step7ReviewRequest(BaseModel):
    review_status: str  # "approved" | "revision_small" | "revision_large"
    editor_notes: str = ""
    edited_content: str | None = None  # Optional: edited article content


# ─── Helper ────────────────────────────────────────────────────────────────────

def _get_session_or_404(session_id: str) -> dict:
    try:
        return load_session(session_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' tidak ditemukan")


# ─── Step 1 — Input Artikel ────────────────────────────────────────────────────

@router.post("/{session_id}/steps/1/submit")
async def submit_article(session_id: str, req: Step1Request):
    """[Step 1] Editor submit artikel referensi."""
    session = _get_session_or_404(session_id)

    now = datetime.now(timezone.utc).isoformat()
    article_data = {
        "title": req.title,
        "body": req.body,
        "sources": req.sources,
        "metadata": req.metadata or {},
        "submitted_at": now,
    }

    session["data"]["step_1"] = article_data
    session["step_statuses"]["step_1"] = "done"
    session["current_step"] = 2
    session["status"] = "in_progress"
    save_session(session)

    logger.info(f"[{session_id}] Step 1 submitted: {req.title[:50]}")
    return {"status": "ok", "session": session}


# ─── AI Steps (Step 2, Step 3, Step 5, Step 6) ───────────────────────────────

@router.post("/{session_id}/steps/{step_number}/run")
async def run_pipeline_step(session_id: str, step_number: int):
    """Jalankan step AI pipeline (Step 2, Step 3, Step 5, Step 6)."""
    if step_number not in (2, 3, 5, 6):
        raise HTTPException(
            status_code=400,
            detail=f"Step {step_number} tidak bisa dijalankan via endpoint ini. "
                   f"Steps 1, 4, 7, 8 memerlukan aksi human."
        )

    session = _get_session_or_404(session_id)

    # Validasi prerequisite
    prev_map = {2: 1, 3: 2, 5: 4, 6: 5}
    prev_step = prev_map[step_number]
    prev_key = f"step_{prev_step}"

    if session["data"].get(prev_key) is None:
        raise HTTPException(
            status_code=400,
            detail=f"Step {step_number} tidak bisa dijalankan — Step {prev_step} belum selesai."
        )

    step_key = f"step_{step_number}"
    session["step_statuses"][step_key] = "running"
    save_session(session)

    try:
        result = await run_step(step_number, session)
        session["data"][step_key] = result
        session["step_statuses"][step_key] = "done"
        session["current_step"] = step_number + 1
        save_session(session)
        logger.info(f"[{session_id}] Step {step_number} completed")
        return {"status": "ok", "step": step_number, "result": result, "session": session}

    except Exception as e:
        session["step_statuses"][step_key] = "error"
        session["error_log"].append({
            "step": step_number,
            "error_type": type(e).__name__,
            "message": str(e),
            "occurred_at": datetime.now(timezone.utc).isoformat(),
        })
        save_session(session)
        logger.error(f"[{session_id}] Step {step_number} error: {e}")
        raise HTTPException(status_code=500, detail=f"Step {step_number} gagal: {str(e)}")


# ─── Step 4 — Pilih Angle & Generate Title Recommendations ─────────────────────

@router.post("/{session_id}/steps/4/select-and-generate-title")
async def select_angle_and_generate_title(session_id: str, req: Step4AngleSelectRequest):
    """[Step 4] Editor pilih angle → generate rekomendasi judul via Groq AI."""
    session = _get_session_or_404(session_id)

    if not session["data"].get("step_3"):
        raise HTTPException(status_code=400, detail="Step 3 (Gap Analysis) belum selesai.")

    angles = session["data"]["step_3"].get("angles", [])
    valid_ids = [a["id"] for a in angles]
    if req.selected_angle_id not in valid_ids:
        raise HTTPException(
            status_code=400,
            detail=f"Angle ID '{req.selected_angle_id}' tidak valid. Pilih dari: {valid_ids}"
        )

    adapter = get_ai_adapter()
    titles_data = await generate_titles_for_angle(session, req.selected_angle_id, adapter)

    now = datetime.now(timezone.utc).isoformat()
    session["data"]["step_4"] = {
        "selected_angle_id": req.selected_angle_id,
        "selected_title": titles_data.get("titles", [{}])[0].get("text", None) if titles_data.get("titles") else None,
        "selected_title_id": titles_data.get("titles", [{}])[0].get("id", None) if titles_data.get("titles") else None,
        "titles": titles_data.get("titles", []),
        "primary_keyword": titles_data.get("primary_keyword", ""),
        "selected_at": now,
    }
    session["step_statuses"]["step_4"] = "done"
    session["current_step"] = 4  # tetap di step 4 sampai judul dikonfirmasi
    save_session(session)

    logger.info(f"[{session_id}] Step 4: angle selected = {req.selected_angle_id}, generated {len(titles_data.get('titles', []))} titles")
    return {
        "status": "ok",
        "selected_angle_id": req.selected_angle_id,
        "titles": titles_data,
        "session": session
    }


@router.post("/{session_id}/steps/4/select-title")
async def select_title(session_id: str, req: Step4TitleSelectRequest):
    """[Step 4] Editor konfirmasi pilihan judul final."""
    session = _get_session_or_404(session_id)

    step4 = session["data"].get("step_4")
    if not step4:
        raise HTTPException(status_code=400, detail="Angle belum dipilih di Step 4.")

    titles = step4.get("titles", [])
    selected_text = None

    if req.selected_title_id:
        matched = next((t for t in titles if t["id"] == req.selected_title_id), None)
        if not matched:
            raise HTTPException(status_code=400, detail=f"Title ID '{req.selected_title_id}' tidak ditemukan.")
        selected_text = matched["text"]
        step4["selected_title_id"] = req.selected_title_id
    elif req.custom_title:
        selected_text = req.custom_title
        step4["selected_title_id"] = None
    else:
        raise HTTPException(status_code=400, detail="Harus memilih title_id atau custom_title.")

    step4["selected_title"] = selected_text
    session["step_statuses"]["step_4"] = "done"
    session["current_step"] = 5  # lanjut ke Step 5 (Draft Generation)
    save_session(session)

    logger.info(f"[{session_id}] Step 4 title selected: {selected_text[:60]}")
    return {"status": "ok", "selected_title": selected_text, "session": session}


# ─── Step 7 — Editorial Review ─────────────────────────────────────────────────

@router.post("/{session_id}/steps/7/review")
async def editorial_review(session_id: str, req: Step7ReviewRequest):
    """[Step 7] Editor review dan keputusan final."""
    session = _get_session_or_404(session_id)

    if not session["data"].get("step_6"):
        raise HTTPException(status_code=400, detail="Step 6 (Grounding Check) belum selesai.")

    valid_statuses = ("approved", "revision_small", "revision_large")
    if req.review_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"review_status harus salah satu: {valid_statuses}")

    if req.review_status != "approved" and not req.editor_notes.strip():
        raise HTTPException(status_code=400, detail="editor_notes wajib diisi jika memilih revisi.")

    now = datetime.now(timezone.utc).isoformat()
    session["data"]["step_7"] = {
        "review_status": req.review_status,
        "editor_notes": req.editor_notes,
        "reviewed_at": now,
    }
    session["step_statuses"]["step_7"] = req.review_status

    # Jika ada edited content, update step_5 draft dengan content yang diedit
    if req.edited_content:
        if session["data"].get("step_5"):
            session["data"]["step_5"]["content"] = req.edited_content
            session["data"]["step_5"]["word_count"] = len(req.edited_content.split())
            logger.info(f"[{session_id}] Content edited by editor: {len(req.edited_content)} chars")

    if req.review_status == "approved":
        session["current_step"] = 8
        session["status"] = "in_progress"
    elif req.review_status == "revision_small":
        # LOOP_SMALL: kembali ke Step 5 (Draft Generation)
        session["revision_loop"] = "LOOP_SMALL"
        session["revision_count"]["small"] += 1
        session["current_step"] = 5
        session["data"]["step_5"] = None
        session["data"]["step_6"] = None
        session["step_statuses"]["step_5"] = "pending"
        session["step_statuses"]["step_6"] = "pending"
    elif req.review_status == "revision_large":
        # LOOP_LARGE: kembali ke Step 3 (Gap Analysis & Angle Mapping)
        session["revision_loop"] = "LOOP_LARGE"
        session["revision_count"]["large"] += 1
        session["current_step"] = 3
        for step in ["step_3", "step_4", "step_5", "step_6", "step_7"]:
            session["data"][step] = None
            session["step_statuses"][step] = "pending"

    save_session(session)
    logger.info(f"[{session_id}] Step 7 review: {req.review_status}")
    return {"status": "ok", "review_status": req.review_status, "session": session}


# ─── Step 8 — Publish ─────────────────────────────────────────────────────────

@router.post("/{session_id}/steps/8/publish")
async def publish_article(session_id: str):
    """[Step 8] Publish artikel yang sudah diapprove."""
    session = _get_session_or_404(session_id)

    step7 = session["data"].get("step_7")
    if not step7 or step7.get("review_status") != "approved":
        raise HTTPException(status_code=400, detail="Artikel belum diapprove di Step 7.")

    draft = session["data"].get("step_5", {}) or {}
    step4 = session["data"].get("step_4", {}) or {}
    title = step4.get("selected_title") or draft.get("title", "")
    content = draft.get("content", "")
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")

    now = datetime.now(timezone.utc).isoformat()
    grounding = session["data"].get("step_6", {}) or {}
    facts = session["data"].get("step_2", {}) or {}

    publish_output = {
        "session_id": session["session_id"],
        "article": {
            "title": title,
            "content": content,
            "word_count": len(content.split()),
            "slug": slug,
            "excerpt": content[:300] + "..." if len(content) > 300 else content,
        },
        "publication_meta": {
            "topic": (session["data"].get("step_1", {}) or {}).get("metadata", {}).get("topic", ""),
            "sources": (session["data"].get("step_1", {}) or {}).get("sources", []),
            "angle_used": step4.get("selected_angle_id", ""),
        },
        "pipeline_summary": {
            "total_facts_extracted": facts.get("total_facts", 0),
            "final_grounding_score": grounding.get("grounding_score", 0),
            "revision_small_count": session["revision_count"]["small"],
            "revision_large_count": session["revision_count"]["large"],
        },
        "editor_notes_final": step7.get("editor_notes", ""),
        "published_at": now,
    }

    session["data"]["step_8"] = publish_output
    session["step_statuses"]["step_8"] = "done"
    session["current_step"] = 8
    session["status"] = "completed"
    session["revision_loop"] = None

    save_session(session)
    save_published(session)

    logger.info(f"[{session_id}] Article PUBLISHED: {title[:60]}")
    return {"status": "published", "publish_output": publish_output}
