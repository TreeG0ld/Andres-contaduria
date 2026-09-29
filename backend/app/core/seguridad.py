"""Sesión firmada y códigos de un solo uso.

Todo se resuelve con la librería estándar: un HMAC-SHA256 basta para firmar la
sesión y para guardar el código sin dejarlo en claro. No se añade ninguna
dependencia de autenticación al proyecto.
"""
import base64
import hashlib
import hmac
import json
import secrets
import time

from fastapi import Cookie, HTTPException, status

from app.core.config import settings

COOKIE_SESION = "counter_sesion"


def _b64(datos: bytes) -> str:
    return base64.urlsafe_b64encode(datos).decode().rstrip("=")


def _de_b64(texto: str) -> bytes:
    relleno = "=" * (-len(texto) % 4)
    return base64.urlsafe_b64decode(texto + relleno)


def _firmar(mensaje: bytes) -> str:
    firma = hmac.new(settings.sesion_secreto.encode(), mensaje, hashlib.sha256)
    return _b64(firma.digest())


# --- Códigos de acceso ----------------------------------------------------

def generar_codigo() -> str:
    """Seis dígitos con generador criptográfico, no con random()."""
    return f"{secrets.randbelow(1_000_000):06d}"


def huella_codigo(codigo: str) -> str:
    """El código nunca se guarda en claro: si alguien lee la tabla, no puede
    usarlo. Va con HMAC y no con un hash pelado para que sin el secreto no
    sirva de nada precalcular los apenas un millón de combinaciones."""
    return hmac.new(
        settings.sesion_secreto.encode(), codigo.encode(), hashlib.sha256
    ).hexdigest()


def codigo_coincide(codigo: str, huella_guardada: str) -> bool:
    # compare_digest evita filtrar información por el tiempo de comparación
    return hmac.compare_digest(huella_codigo(codigo), huella_guardada)


# --- Sesión ---------------------------------------------------------------

def crear_token_sesion() -> str:
    """Token propio en dos partes: contenido y firma. Equivale a un JWT
    mínimo, sin arrastrar una librería entera para un solo caso de uso."""
    contenido = json.dumps({"exp": int(time.time()) + settings.sesion_horas * 3600})
    cuerpo = _b64(contenido.encode())
    return f"{cuerpo}.{_firmar(cuerpo.encode())}"


def token_valido(token: str | None) -> bool:
    if not token or "." not in token:
        return False

    cuerpo, firma = token.rsplit(".", 1)

    if not hmac.compare_digest(_firmar(cuerpo.encode()), firma):
        return False

    try:
        datos = json.loads(_de_b64(cuerpo))
    except (ValueError, json.JSONDecodeError):
        return False

    return int(datos.get("exp", 0)) > time.time()


def requiere_sesion(counter_sesion: str | None = Cookie(default=None)) -> None:
    """Dependencia que cierra los endpoints. Se aplica a los routers enteros
    en main.py, no endpoint por endpoint, para que ninguno quede abierto por
    olvido al agregarlo después."""
    if not token_valido(counter_sesion):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión no válida o expirada",
        )
