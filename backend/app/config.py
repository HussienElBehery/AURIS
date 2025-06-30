from pydantic_settings import BaseSettings
from typing import List, Optional
import os
from dotenv import load_dotenv

# Load .env from parent directory (root)
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env'))

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./auris.db")
    
    # JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-here-make-it-long-and-secure")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    
    # Application
    APP_NAME: str = os.getenv("APP_NAME", "AURIS Backend")
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"
    
    # CORS - Allow all common frontend development origins
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",      # Vite default
        "http://localhost:3000",      # React default
        "http://localhost:8080",      # Vue default
        "http://127.0.0.1:5173",      # Vite with IP
        "http://127.0.0.1:3000",      # React with IP
        "http://127.0.0.1:8080",      # Vue with IP
        "http://localhost:4173",      # Vite preview
        "http://127.0.0.1:4173",      # Vite preview with IP
    ]
    
    # SMTP Settings (optional)
    SMTP_HOST: Optional[str] = os.getenv("SMTP_HOST")
    SMTP_PORT: Optional[str] = os.getenv("SMTP_PORT")
    SMTP_USER: Optional[str] = os.getenv("SMTP_USER")
    SMTP_PASSWORD: Optional[str] = os.getenv("SMTP_PASSWORD")
    
    # Ollama Settings
    DEFAULT_MODEL: str = os.getenv("DEFAULT_MODEL", "deepseek-r1:latest")
    
    class Config:
        env_file = ".env"
        extra = "ignore"  # Ignore extra fields in .env file

settings = Settings() 