"""
Application configuration via pydantic-settings.
Loads environment variables from .env file.
"""

from pathlib import Path
# pyrefly: ignore [missing-import]
from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    """All environment variables for IP-SAKTI Sahayak backend."""

    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE) if _ENV_FILE.exists() else ".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # ── MongoDB ──────────────────────────────────────────────────────────
    MONGODB_URI: str = ""
    MONGODB_DB_NAME: str = "ipsakti"

    # ── Gemini (cloud LLM) ───────────────────────────────────────────────
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.6-flash"
    GEMINI_TIMEOUT_S: float = 20.0
    GEMINI_MAX_RETRIES: int = 2

    # ── Anthropic (legacy / fallback) ────────────────────────────────────
    ANTHROPIC_API_KEY: str = ""

    # ── Ollama (local/privacy LLM) ───────────────────────────────────────
    OLLAMA_BASE_URL: str = "http://localhost:11434"

    # ── JWT ───────────────────────────────────────────────────────────────
    JWT_SECRET: str = ""
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # ── Public passport verification ────────────────────────────────────
    PUBLIC_APP_BASE_URL: str = "http://localhost:5173"

    # ── Bhashini ─────────────────────────────────────────────────────────
    BHASHINI_API_KEY: str = ""

    # ── Embeddings ───────────────────────────────────────────────────────
    EMBEDDING_MODEL: str = "BAAI/bge-m3"

    # ── LLM mode & provider ──────────────────────────────────────────────
    LLM_MODE: str = "cloud"  # "cloud" (Gemini/Claude) or "local" (Ollama/Qwen3)
    LLM_PROVIDER: str = "gemini"  # "gemini", "anthropic", or "ollama"

    # ── ABS-specific pipeline overrides ──────────────────────────────────
    # Embedding timeout for ABS queries. The general pipeline uses 6s; ABS
    # uses 12s to avoid false "embedding failed" on the first local embed call.
    ABS_EMBEDDING_TIMEOUT_S: float = 12.0
    # Gemini generation timeout for ABS. ABS uses 1 primary attempt with a
    # short timeout and immediately falls back to evidence-grounded text.
    ABS_GEMINI_TIMEOUT_S: float = 12.0
    ABS_GEMINI_MAX_RETRIES: int = 0  # 0 = no retries; fallback fires immediately


# Singleton — import `settings` everywhere
settings = Settings()  # type: ignore[call-arg]
