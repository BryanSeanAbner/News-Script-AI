from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL or DATABASE_URL == "sqlite:///./newsscript.db":
    if os.getenv("VERCEL"):
        DATABASE_URL = "sqlite:////tmp/newsscript.db"
    else:
        DATABASE_URL = "sqlite:///./newsscript.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100))
    role = Column(String(20), default="reporter")  # admin, editor, reporter
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    news_sources = relationship("NewsSource", back_populates="user")
    scripts = relationship("Script", back_populates="user")


class NewsSource(Base):
    __tablename__ = "news_sources"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(300))
    raw_text = Column(Text, nullable=False)
    source_url = Column(String(500))
    extracted_facts = Column(Text)  # JSON string
    ai_analysis = Column(Text)      # JSON string (full AI response)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="news_sources")
    scripts = relationship("Script", back_populates="news_source")


class Script(Base):
    __tablename__ = "scripts"

    id = Column(Integer, primary_key=True, index=True)
    news_source_id = Column(Integer, ForeignKey("news_sources.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    platform = Column(String(50), nullable=False)  # tv_radio, article, instagram, tiktok, youtube
    angle = Column(String(500))
    angle_reasoning = Column(Text)
    headline = Column(String(500))
    content = Column(Text, nullable=False)
    tone = Column(String(50))       # positive, negative, neutral
    word_count = Column(Integer)
    version = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    news_source = relationship("NewsSource", back_populates="scripts")
    user = relationship("User", back_populates="scripts")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    Base.metadata.create_all(bind=engine)
