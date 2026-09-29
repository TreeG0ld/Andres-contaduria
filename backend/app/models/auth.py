import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, String

from app.core.db import Base


class CodigoAcceso(Base):
    """Código de un solo uso para ingresar.

    Se guarda la huella, nunca el código. La fila queda aunque se use o
    caduque: sirve para contar cuántos se pidieron en la última hora y así
    frenar los reenvíos en masa.
    """

    __tablename__ = "codigos_acceso"

    id = Column(Integer, primary_key=True, index=True)
    codigo_hash = Column(String, nullable=False)
    creado_at = Column(DateTime, nullable=False, default=datetime.datetime.utcnow)
    expira_at = Column(DateTime, nullable=False)
    usado = Column(Boolean, nullable=False, default=False)
    intentos = Column(Integer, nullable=False, default=0)
