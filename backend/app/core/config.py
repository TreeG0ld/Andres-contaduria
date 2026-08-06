from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://pila:pila@db:5432/pila"
    almacen_dir: str = "/almacen"


settings = Settings()
