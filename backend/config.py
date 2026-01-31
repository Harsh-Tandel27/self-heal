"""
Configuration management for the Self-Healing Support Agent.
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # API Keys
    groq_api_key: str = ""
    
    # MongoDB
    mongodb_uri: str = "mongodb://localhost:27017"
    database_name: str = "self_healing_agent"
    
    # Agent Configuration
    agent_loop_interval_seconds: int = 5
    max_signals_per_batch: int = 50
    
    # Risk Thresholds for Auto-Approval
    auto_approve_confidence_threshold: float = 0.9
    low_risk_approval_count: int = 0  # Auto-approve
    medium_risk_approval_count: int = 1
    high_risk_approval_count: int = 2
    
    # Groq Configuration
    groq_model: str = "llama-3.3-70b-versatile"
    
    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
