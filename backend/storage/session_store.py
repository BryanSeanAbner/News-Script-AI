"""
Session Store — read/write session JSON files (8-step pipeline)
"""

import json
import logging
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

from utils.config import settings

logger = logging.getLogger(__name__)

SESSIONS_DIR = Path(settings.DATA_SESSIONS_PATH)
PUBLISHED_DIR = Path(settings.DATA_PUBLISHED_PATH)


def _ensure_dirs():
    """Pastikan direktori storage sudah ada."""
    SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
    PUBLISHED_DIR.mkdir(parents=True, exist_ok=True)


def _session_path(session_id: str) -> Path:
    return SESSIONS_DIR / f"{session_id}.json"


def _published_path(session_id: str) -> Path:
    return PUBLISHED_DIR / f"{session_id}.json"


def create_session() -> dict:
    """Buat session baru dengan 8-step pipeline."""
    _ensure_dirs()
    session_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    session = {
        "session_id": session_id,
        "created_at": now,
        "updated_at": now,
        "current_step": 1,
        "status": "draft",
        "revision_loop": None,
        "revision_count": {"small": 0, "large": 0},
        "step_statuses": {
            "step_1": "pending",
            "step_2": "pending",
            "step_3": "pending",
            "step_4": "pending",
            "step_5": "pending",
            "step_6": "pending",
            "step_7": "pending",
            "step_8": "pending",
        },
        "data": {
            "step_1": None,
            "step_2": None,
            "step_3": None,
            "step_4": None,
            "step_5": None,
            "step_6": None,
            "step_7": None,
            "step_8": None,
        },
        "error_log": [],
    }

    save_session(session)
    logger.info(f"Session created: {session_id}")
    return session


def load_session(session_id: str) -> dict:
    """Load session dari file JSON."""
    path = _session_path(session_id)
    if not path.exists():
        raise FileNotFoundError(f"Session tidak ditemukan: {session_id}")

    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_session(session: dict) -> None:
    """Simpan session ke file JSON (atomic write)."""
    _ensure_dirs()
    session_id = session["session_id"]
    session["updated_at"] = datetime.now(timezone.utc).isoformat()

    path = _session_path(session_id)
    tmp_path = path.with_suffix(".tmp")

    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(session, f, ensure_ascii=False, indent=2)

    os.replace(tmp_path, path)
    logger.debug(f"Session saved: {session_id} (step {session.get('current_step')})")


def list_sessions() -> list[dict]:
    """List semua session yang ada (dengan data step yang diperlukan)."""
    _ensure_dirs()
    sessions = []
    for path in sorted(SESSIONS_DIR.glob("*.json"), key=os.path.getmtime, reverse=True):
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            # Extract only necessary data fields to reduce payload
            session_data = {
                "step_1": data.get("data", {}).get("step_1"),
                "step_2": data.get("data", {}).get("step_2"),
                "step_4": data.get("data", {}).get("step_4"),
                "step_5": data.get("data", {}).get("step_5"),
                "step_6": data.get("data", {}).get("step_6"),
                "step_7": data.get("data", {}).get("step_7"),
                "step_8": data.get("data", {}).get("step_8"),
            }
            
            sessions.append({
                "session_id": data["session_id"],
                "created_at": data["created_at"],
                "updated_at": data["updated_at"],
                "current_step": data["current_step"],
                "status": data["status"],
                "step_statuses": data.get("step_statuses", {}),
                "data": session_data,  # Include necessary data for frontend
            })
        except Exception as e:
            logger.warning(f"Gagal load session {path.name}: {e}")
    return sessions


def delete_session(session_id: str) -> None:
    """Hapus session file."""
    path = _session_path(session_id)
    if path.exists():
        path.unlink()
        logger.info(f"Session deleted: {session_id}")
    else:
        raise FileNotFoundError(f"Session tidak ditemukan: {session_id}")


def save_published(session: dict) -> dict:
    """Pindahkan session ke published storage."""
    _ensure_dirs()
    session_id = session["session_id"]
    path = _published_path(session_id)

    with open(path, "w", encoding="utf-8") as f:
        json.dump(session, f, ensure_ascii=False, indent=2)

    logger.info(f"Session published: {session_id}")
    return session
