from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from models.database import create_tables
from routers import auth, news, scripts

load_dotenv()

app = FastAPI(
    title="NewsScript AI API",
    description="API untuk aplikasi pembuatan naskah berita berbasis Gemini AI",
    version="1.0.0"
)

allowed_origins_raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,*")
allowed_origins = [o.strip() for o in allowed_origins_raw.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if "*" in allowed_origins else allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(news.router)
app.include_router(scripts.router)


@app.on_event("startup")
def startup_event():
    create_tables()
    print("✅ Database tables created/verified")
    print("✅ NewsScript AI API is running!")


@app.get("/health")
def health_check():
    return {"status": "ok", "message": "NewsScript AI API berjalan dengan baik"}


@app.get("/")
def root():
    return {
        "app": "NewsScript AI",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }
