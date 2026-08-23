from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.db import Base

class Aportante(Base):
    __tablename__ = "aportantes"

    id = Column(Integer, primary_key=True, index=True)
    tipo_documento = Column(String, nullable=False)
    numero_documento = Column(String, nullable=False)
    razon_social = Column(String, nullable=False)
    exonerado = Column(Boolean, default=False)
    nit_arl = Column(String, nullable=True)
    nit_ccf = Column(String, nullable=True)
    nit_afp = Column(String, nullable=True)
    
    __table_args__ = (
        UniqueConstraint("tipo_documento", "numero_documento", name="uix_aportante_doc"),
    )


class Trabajador(Base):
    __tablename__ = "trabajadores"

    id = Column(Integer, primary_key=True, index=True)
    tipo_documento = Column(String, nullable=False)
    numero_documento = Column(String, nullable=False)
    registro = Column(String, unique=True, nullable=False)
    nombre_completo = Column(String, nullable=False)
    clase_gasto = Column(String, nullable=True) # ej: '51', '52', '72'

    __table_args__ = (
        UniqueConstraint("tipo_documento", "numero_documento", name="uix_trabajador_doc"),
    )

class Vinculo(Base):
    __tablename__ = "vinculos"

    id = Column(Integer, primary_key=True, index=True)
    trabajador_id = Column(Integer, ForeignKey("trabajadores.id"), nullable=False)
    aportante_id = Column(Integer, ForeignKey("aportantes.id"), nullable=False)
    fecha_ingreso = Column(Date, nullable=False)
    fecha_retiro = Column(Date, nullable=True)
    estado = Column(String, default="activo", nullable=False) # activo | liquidado

    trabajador = relationship("Trabajador")
    aportante = relationship("Aportante")
