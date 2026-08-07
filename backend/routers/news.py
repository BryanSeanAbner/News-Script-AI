from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import json

from models.database import get_db, NewsSource, User
from routers.auth import get_current_user
from services.gemini_agent import analyze_news

router = APIRouter(prefix="/api/news", tags=["news"])


# ── Schemas ────────────────────────────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    raw_text: str
    platforms: list[str]  # ["tv_radio", "article", "instagram", "tiktok", "youtube"]
    source_url: Optional[str] = None


class RegenerateRequest(BaseModel):
    news_source_id: int
    angle_id: int  # index of selected angle
    platform: str


class NewsSourceResponse(BaseModel):
    id: int
    title: Optional[str]
    raw_text: str
    source_url: Optional[str]
    extracted_facts: Optional[str]
    created_at: datetime
    user_id: int

    class Config:
        from_attributes = True


# ── Routes ─────────────────────────────────────────────────────────────────────
@router.post("/analyze")
async def analyze_news_endpoint(
    request: AnalyzeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Jalankan agentic AI pipeline untuk analisis berita."""
    if not request.raw_text or len(request.raw_text.strip()) < 50:
        raise HTTPException(status_code=400, detail="Teks berita terlalu pendek (minimal 50 karakter)")

    if not request.platforms:
        raise HTTPException(status_code=400, detail="Pilih minimal satu platform")

    valid_platforms = ["tv_radio", "article", "instagram", "tiktok", "youtube"]
    for p in request.platforms:
        if p not in valid_platforms:
            raise HTTPException(status_code=400, detail=f"Platform tidak valid: {p}")

    try:
        result = await analyze_news(request.raw_text, request.platforms)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Error: {str(e)}")

    # Simpan ke database
    news_source = NewsSource(
        user_id=current_user.id,
        title=result["facts"].get("title", "Berita tanpa judul"),
        raw_text=request.raw_text,
        source_url=request.source_url,
        extracted_facts=json.dumps(result["facts"], ensure_ascii=False),
        ai_analysis=json.dumps(result, ensure_ascii=False)
    )
    db.add(news_source)
    db.commit()
    db.refresh(news_source)

    return {
        "news_source_id": news_source.id,
        "result": result
    }


@router.get("/history", response_model=list[NewsSourceResponse])
def get_news_history(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Ambil riwayat berita yang pernah dianalisis oleh seluruh tim."""
    news_list = db.query(NewsSource).order_by(NewsSource.created_at.desc()).offset(skip).limit(limit).all()
    return news_list


@router.get("/{news_id}")
def get_news_detail(
    news_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    news = db.query(NewsSource).filter(NewsSource.id == news_id).first()
    if not news:
        raise HTTPException(status_code=404, detail="Berita tidak ditemukan")

    return {
        "id": news.id,
        "title": news.title,
        "raw_text": news.raw_text,
        "source_url": news.source_url,
        "extracted_facts": json.loads(news.extracted_facts) if news.extracted_facts else None,
        "ai_analysis": json.loads(news.ai_analysis) if news.ai_analysis else None,
        "created_at": news.created_at,
        "user_id": news.user_id
    }


@router.delete("/{news_id}")
def delete_news(
    news_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    news = db.query(NewsSource).filter(NewsSource.id == news_id).first()
    if not news:
        raise HTTPException(status_code=404, detail="Berita tidak ditemukan")

    # Only owner or admin can delete
    if news.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Tidak punya izin menghapus berita ini")

    db.delete(news)
    db.commit()
    return {"message": "Berita berhasil dihapus"}
