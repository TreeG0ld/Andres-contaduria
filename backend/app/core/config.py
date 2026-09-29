from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://pila:pila@db:5432/pila"
    almacen_dir: str = "/almacen"

    # --- Acceso ---
    # El correo de destino vive solo aquí, en el .env del servidor. Nunca se
    # devuelve por la API ni llega al navegador: el frontend no sabe —ni
    # necesita saber— a dónde se envió el código.
    auth_correo_destino: str = ""
    auth_remitente: str = "Counter <onboarding@resend.dev>"
    resend_api_key: str = ""

    # Clave con la que se firman la sesión y los códigos. Si queda vacía, la
    # app no arranca (ver validar_configuracion): un secreto por defecto haría
    # que cualquiera pudiera fabricarse una sesión válida.
    sesion_secreto: str = ""
    sesion_horas: int = 8
    codigo_minutos: int = 10
    codigo_max_intentos: int = 3
    # Límites para que nadie llene el buzón pulsando "reenviar"
    codigo_espera_segundos: int = 60
    codigo_max_por_hora: int = 5


settings = Settings()


def validar_configuracion() -> list[str]:
    """Devuelve lo que falte para que el acceso funcione. Se llama al arrancar
    para fallar de una vez y no al primer intento de ingreso."""
    faltantes = []
    if not settings.sesion_secreto:
        faltantes.append("SESION_SECRETO")
    if not settings.auth_correo_destino:
        faltantes.append("AUTH_CORREO_DESTINO")
    if not settings.resend_api_key:
        faltantes.append("RESEND_API_KEY")
    return faltantes
