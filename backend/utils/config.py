"""
Configuration — membaca semua environment variables dari .env
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # AI Provider — Groq API (Primary)
    GROK_API_KEY: str = ""
    GROK_BASE_URL: str = "https://api.groq.com/openai/v1"
    GROK_MODEL: str = "llama-3.3-70b-versatile"

    # AI Provider — Google Gemini (Fallback 1)
    GEMINI_API_KEY: str = ""
    GEMINI_BASE_URL: str = "https://generativelanguage.googleapis.com/v1beta"
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # AI Provider — OpenRouter (Fallback 2)
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENROUTER_MODEL: str = "meta-llama/llama-3.3-70b-instruct"

    # App
    APP_NAME: str = "NewsScript AI"
    BACKEND_PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:5173"
    APP_ENV: str = "development"

    # Pipeline
    PIPELINE_GAP_COUNT: int = 3
    PIPELINE_ANGLE_COUNT: int = 3
    PIPELINE_TITLE_COUNT: int = 5
    GROUNDING_THRESHOLD_PASS: float = 0.85
    GROUNDING_THRESHOLD_WARN: float = 0.70
    GROK_MAX_RETRY: int = 3
    RETRY_DELAY_BASE: float = 1.0

    # Storage
    DATA_SESSIONS_PATH: str = "data/sessions"
    DATA_PUBLISHED_PATH: str = "data/published"
    SESSION_TTL_HOURS: int = 168
    SESSION_MAX_COUNT: int = 0

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_TO_FILE: bool = False
    LOG_FILE_PATH: str = "logs/app.log"

    # Advanced AI
    GROK_TEMPERATURE: float = 0.3
    GROK_MAX_TOKENS: int = 4096


settings = Settings()
