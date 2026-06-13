from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./thoughtflow.db"
    openai_api_key: str | None = None
    openai_model: str = "gpt-5.5"
    allowed_origins: str = (
        "http://localhost:5173,http://localhost:4173,"
        "capacitor://localhost,https://localhost"
    )

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
