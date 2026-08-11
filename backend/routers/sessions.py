"""
Sessions Router — CRUD operations untuk session management
"""

import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from storage.session_store import (
    create_session,
    load_session,
    list_sessions,
    delete_session,
)

logger = logging.getLogger(__name__)
router = APIRouter()


class CreateSessionRequest(BaseModel):
    """Request body untuk membuat session baru (opsional)."""
    pass


@router.post("/", status_code=201)
async def create_new_session():
    """Buat session pipeline baru."""
    session = create_session()
    logger.info(f"New session created: {session['session_id']}")
    return session


@router.get("/")
async def get_all_sessions():
    """Dapatkan daftar semua session (metadata saja)."""
    sessions = list_sessions()
    return {"sessions": sessions, "total": len(sessions)}


@router.get("/{session_id}")
async def get_session(session_id: str):
    """Dapatkan detail lengkap satu session."""
    try:
        session = load_session(session_id)
        return session
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' tidak ditemukan")


@router.delete("/{session_id}", status_code=204)
async def remove_session(session_id: str):
    """Hapus session."""
    try:
        delete_session(session_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' tidak ditemukan")
