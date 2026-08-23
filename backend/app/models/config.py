from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Date, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.db import Base
import datetime

class VersionFormula(Base):
    __tablename__ = "versiones_formula"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    activa = Column(Boolean, default=False)
    creado_at = Column(Date, default=datetime.date.today)

class Formula(Base):
    __tablename__ = "formulas"

    id = Column(Integer, primary_key=True, index=True)
    version_id = Column(Integer, ForeignKey("versiones_formula.id"), nullable=False)
    codigo = Column(String, nullable=False)
    orden = Column(Integer, nullable=False)
    etiqueta = Column(String, nullable=False)
    expresion = Column(String, nullable=False)

    __table_args__ = (
        UniqueConstraint("version_id", "codigo", name="uix_formula_version_codigo"),
        UniqueConstraint("version_id", "orden", name="uix_formula_version_orden"),
    )

class Plantilla(Base):
    __tablename__ = "plantillas"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    tipo = Column(String, nullable=False) # nomina | dian
    modo = Column(String, nullable=False) # ancho_fijo | delimitado
    separador = Column(String, nullable=True)
    version = Column(Integer, nullable=False, default=1)
    activa = Column(Boolean, default=True)

class MapeoPlantilla(Base):
    __tablename__ = "mapeo_plantilla"

    id = Column(Integer, primary_key=True, index=True)
    plantilla_id = Column(Integer, ForeignKey("plantillas.id"), nullable=False)
    posicion = Column(Integer, nullable=False)
    codigo_calculo = Column(String, nullable=True)
    columna_destino = Column(String, nullable=True)
    formato = Column(String, nullable=True)
    longitud = Column(Integer, nullable=True)
    relleno = Column(String, nullable=True)
    alineacion = Column(String, nullable=True) # izq | der

class Exportacion(Base):
    __tablename__ = "exportaciones"

    id = Column(Integer, primary_key=True, index=True)
    carga_id = Column(Integer, ForeignKey("cargas.id"), nullable=False) # from nomina
    plantilla_id = Column(Integer, ForeignKey("plantillas.id"), nullable=False)
    ruta_archivo = Column(String, nullable=False)
    hash_archivo = Column(String, nullable=False)
    generado_at = Column(Date, default=datetime.date.today)
