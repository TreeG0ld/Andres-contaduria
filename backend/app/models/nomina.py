from sqlalchemy import Column, Integer, String, Date, ForeignKey, Numeric, Boolean, UniqueConstraint, JSON
from sqlalchemy.orm import relationship
from app.core.db import Base
import datetime

class Carga(Base):
    __tablename__ = "cargas"

    id = Column(Integer, primary_key=True, index=True)
    aportante_id = Column(Integer, ForeignKey("aportantes.id"), nullable=False)
    operador = Column(String, nullable=False)
    numero_planilla = Column(String, nullable=False)
    periodo = Column(Date, nullable=False) # primer dia del mes de aportes
    ruta_pdf = Column(String, nullable=True)
    hash_archivo = Column(String, nullable=True)
    estado = Column(String, nullable=False, default="cargada")
    version_formula_id = Column(Integer, nullable=True)
    creado_at = Column(Date, default=datetime.date.today)

    __table_args__ = (
        UniqueConstraint("aportante_id", "periodo", name="uix_carga_periodo"),
    )

class LineaNomina(Base):
    __tablename__ = "lineas_nomina"

    id = Column(Integer, primary_key=True, index=True)
    carga_id = Column(Integer, ForeignKey("cargas.id"), nullable=False)
    vinculo_id = Column(Integer, ForeignKey("vinculos.id"), nullable=False)
    
    dias_afp = Column(Integer, nullable=False, default=0)
    dias_eps = Column(Integer, nullable=False, default=0)
    dias_arp = Column(Integer, nullable=False, default=0)
    dias_ccf = Column(Integer, nullable=False, default=0)
    
    ibc_pension = Column(Numeric(15, 2), nullable=False, default=0)
    ibc_salud = Column(Numeric(15, 2), nullable=False, default=0)
    ibc_riesgos = Column(Numeric(15, 2), nullable=False, default=0)
    ibc_ccf = Column(Numeric(15, 2), nullable=False, default=0)
    
    tarifa_riesgos = Column(Numeric(15, 4), nullable=True)
    
    salario_basico = Column(Numeric(15, 2), nullable=True)
    
    nov_ing = Column(Boolean, nullable=False, default=False)
    nov_ret = Column(Boolean, nullable=False, default=False)
    nov_crudas = Column(JSON, nullable=True)

    __table_args__ = (
        UniqueConstraint("carga_id", "vinculo_id", name="uix_linea_carga_vinculo"),
    )

class ValorCalculado(Base):
    __tablename__ = "valores_calculados"

    id = Column(Integer, primary_key=True, index=True)
    linea_id = Column(Integer, ForeignKey("lineas_nomina.id"), nullable=False)
    codigo = Column(String, nullable=False)
    orden = Column(Integer, nullable=False)
    valor_original = Column(Numeric(15, 2), nullable=False)
    valor_editado = Column(Numeric(15, 2), nullable=True)
    editado_at = Column(Date, nullable=True)

    __table_args__ = (
        UniqueConstraint("linea_id", "codigo", name="uix_valor_linea_codigo"),
    )
