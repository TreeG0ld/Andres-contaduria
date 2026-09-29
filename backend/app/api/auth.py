import datetime

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import SessionLocal
from app.core.seguridad import (
    COOKIE_SESION,
    codigo_coincide,
    crear_token_sesion,
    generar_codigo,
    huella_codigo,
    token_valido,
)
from app.models.auth import CodigoAcceso
from app.servicios.correo import enviar_codigo

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class VerificacionEntrada(BaseModel):
    codigo: str = Field(min_length=6, max_length=6)


def _ahora() -> datetime.datetime:
    return datetime.datetime.utcnow()


@router.post("/solicitar")
def solicitar_codigo(db: Session = Depends(get_db)):
    """Genera un código y lo envía al correo configurado en el servidor.

    La respuesta es siempre la misma y jamás nombra la dirección de destino,
    ni siquiera enmascarada: quien abra la red del navegador no puede deducir
    a dónde llegó el código.
    """
    ahora = _ahora()

    # Freno corto: evita que pulsar "reenviar" muchas veces llene el buzón
    ultimo = db.query(CodigoAcceso).order_by(CodigoAcceso.creado_at.desc()).first()
    if ultimo:
        espera = settings.codigo_espera_segundos - (ahora - ultimo.creado_at).total_seconds()
        if espera > 0:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Espera {int(espera) + 1} segundos antes de pedir otro código.",
            )

    # Freno largo: tope por hora, por si alguien insiste con paciencia
    desde = ahora - datetime.timedelta(hours=1)
    if db.query(CodigoAcceso).filter(CodigoAcceso.creado_at >= desde).count() >= settings.codigo_max_por_hora:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiadas solicitudes. Intenta de nuevo en una hora.",
        )

    codigo = generar_codigo()

    registro = CodigoAcceso(
        codigo_hash=huella_codigo(codigo),
        creado_at=ahora,
        expira_at=ahora + datetime.timedelta(minutes=settings.codigo_minutos),
        usado=False,
        intentos=0,
    )
    db.add(registro)
    db.commit()

    try:
        enviar_codigo(codigo)
    except Exception:
        # Se descarta el código: si el correo no salió, dejarlo vivo solo
        # ampliaría la ventana para adivinarlo.
        db.delete(registro)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo enviar el código. Inténtalo de nuevo.",
        )

    return {"status": "enviado", "expira_en_minutos": settings.codigo_minutos}


@router.post("/verificar")
def verificar_codigo(datos: VerificacionEntrada, respuesta: Response, db: Session = Depends(get_db)):
    ahora = _ahora()

    registro = (
        db.query(CodigoAcceso)
        .filter(CodigoAcceso.usado == False)  # noqa: E712
        .filter(CodigoAcceso.expira_at > ahora)
        .order_by(CodigoAcceso.creado_at.desc())
        .first()
    )

    # Mismo mensaje para "no hay código", "caducó" y "está mal": distinguirlos
    # solo le diría a quien prueba a ciegas si va por buen camino.
    generico = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Código incorrecto o vencido.",
    )

    if not registro:
        raise generico

    if registro.intentos >= settings.codigo_max_intentos:
        registro.usado = True
        db.commit()
        raise generico

    if not codigo_coincide(datos.codigo, registro.codigo_hash):
        registro.intentos += 1
        # Al agotar los intentos el código se quema, aunque fuera el correcto:
        # así no sirve de nada seguir probando combinaciones.
        if registro.intentos >= settings.codigo_max_intentos:
            registro.usado = True
        db.commit()
        raise generico

    registro.usado = True
    db.commit()

    respuesta.set_cookie(
        key=COOKIE_SESION,
        value=crear_token_sesion(),
        max_age=settings.sesion_horas * 3600,
        httponly=True,  # inalcanzable desde JavaScript
        samesite="lax",
        secure=True,
        path="/",
    )
    return {"status": "ok"}


@router.get("/sesion")
def estado_sesion(counter_sesion: str | None = Cookie(default=None)):
    """Consulta si la sesión sigue viva. La usa el frontend al cargar para
    decidir si muestra la app o la pantalla de ingreso."""
    return {"activa": token_valido(counter_sesion)}


@router.post("/salir")
def cerrar_sesion(respuesta: Response):
    respuesta.delete_cookie(COOKIE_SESION, path="/")
    return {"status": "ok"}
