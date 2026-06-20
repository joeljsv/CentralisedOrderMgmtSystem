"""Application configuration loaded from environment variables.

No credentials are hardcoded — everything comes from the environment (a local
.env file in development, platform-injected vars in production).
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # SQLAlchemy URL, e.g. postgresql+psycopg://user:pass@db:5432/oms
    database_url: str = "postgresql+psycopg://oms:oms@localhost:5432/oms"

    # CORS: comma-separated list of allowed origins, or "*" for all.
    frontend_origin: str = "*"

    # Products with quantity below this are flagged as "low stock".
    low_stock_threshold: int = 10

    # Seed demo data on startup if the database is empty.
    seed_on_startup: bool = True

    @property
    def cors_origins(self) -> list[str]:
        if self.frontend_origin.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.frontend_origin.split(",") if o.strip()]

    @property
    def sqlalchemy_url(self) -> str:
        """Normalize the DB URL to the psycopg3 driver.

        Managed providers (e.g. Render) hand out 'postgres://...' or
        'postgresql://...' URLs. SQLAlchemy + psycopg v3 requires the
        'postgresql+psycopg://' scheme, so rewrite it here.
        """
        url = self.database_url
        if url.startswith("postgres://"):
            url = "postgresql+psycopg://" + url[len("postgres://"):]
        elif url.startswith("postgresql://"):
            url = "postgresql+psycopg://" + url[len("postgresql://"):]
        return url


settings = Settings()
