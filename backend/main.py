"""
NewsScript AI — FastAPI Backend Entry Point
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from utils.logger import setup_logger
from utils.config import settings
from routers import sessions, pipeline


# Setup logger
setup_logger()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info(f"🚀 {settings.APP_NAME} backend starting...")
    logger.info(f"   Environment : {settings.APP_ENV}")
    logger.info(f"   Groq model  : {settings.GROK_MODEL}")
    logger.info(f"   Groq URL    : {settings.GROK_BASE_URL}")
    yield
    logger.info("🛑 Backend shutting down.")


app = FastAPI(
    title="NewsScript AI API",
    description="Backend API untuk pipeline jurnalisme berbantuan AI",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — izinkan frontend dev server (localhost & 127.0.0.1)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(sessions.router, prefix="/api/sessions", tags=["Sessions"])
app.include_router(pipeline.router, prefix="/api/sessions", tags=["Pipeline"])


@app.get("/", tags=["Health"])
async def root():
    """Health check endpoint."""
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "env": settings.APP_ENV,
    }


@app.get("/api/health", tags=["Health"])
async def health():
    """Detailed health check."""
    return {
        "status": "healthy",
        "groq_model": settings.GROK_MODEL,
        "groq_key_set": bool(settings.GROK_API_KEY),
        "groq_base_url": settings.GROK_BASE_URL,
    }
