from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str
    OPENROUTER_API_KEY: str
    BETTER_AUTH_SECRET: str
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    
    # DigitalOcean Spaces
    SPACES_ENDPOINT: str
    SPACES_KEY: str
    SPACES_SECRET: str
    SPACES_BUCKET: str
    SPACES_REGION: str
    SPACES_PUBLIC_URL: str
    
    # OCR Settings
    MAX_OCR_PAGES: int = 12
    
    # Upload Settings
    MAX_FILE_SIZE_MB: int = 20
    
    # JWT Settings
    JWT_SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    FRONTEND_URL: str = "http://127.0.0.1:5173"
    QUESTIONS_LIMIT: int = 30
    PAPERS_LIMIT: int = 3
    RESOURCES_LIMIT: int = 3
    
    # PostHog Settings
    POSTHOG_API_KEY: str = ""
    POSTHOG_HOST: str = "https://us.i.posthog.com"
    
    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()
