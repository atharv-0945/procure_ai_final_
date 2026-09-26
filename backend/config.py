import os
from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    # Gemini Document AI
    gemini_procurement_api_key: str = ""
    gemini_api_key: str = ""  # backwards compatibility fallback

    # Grok / xAI Procurement Chatbot
    xai_api_key: str = ""
    grok_model: str = "llama3-70b-8192"
    grok_api_base_url: str = "https://api.groq.com/openai/v1"

    # Tesseract OCR
    tesseract_cmd: str = ""

    # Database & Storage
    database_url: str = "sqlite:///./procure_ai.db"
    upload_dir: str = "./uploads"
    max_upload_size_mb: int = 50

    class Config:
        env_file = ".env"
        extra = "ignore"

    @property
    def active_gemini_key(self) -> str:
        """Get the active Gemini API key, checking procurement-specific first."""
        key = self.gemini_procurement_api_key or self.gemini_api_key or os.environ.get("GEMINI_PROCUREMENT_API_KEY", "") or os.environ.get("GEMINI_API_KEY", "")
        return key.strip()

    @property
    def active_xai_key(self) -> str:
        """Get the active xAI API key."""
        key = self.xai_api_key or os.environ.get("XAI_API_KEY", "")
        return key.strip()


@lru_cache()
def get_settings() -> Settings:
    return Settings()
