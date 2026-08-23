from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal

@dataclass(frozen=True)
class Aportante:
    tipo_documento: str
    numero_documento: str
    razon_social: str
    codigo_sucursal: str | None
    exonerado: bool

@dataclass(frozen=True)
class Planilla:
    operador: str
    numero_planilla: str
    periodo_aportes: date
    periodo_salud: date
    fecha_pago: date | None
    total_cotizantes_declarado: int

@dataclass(frozen=True)
class Dias:
    afp: int
    eps: int
    arp: int
    ccf: int

    @property
    def laborales(self) -> int:
        return self.ccf

@dataclass(frozen=True)
class Novedades:
    ing: bool
    ret: bool
    crudas: dict[str, str] = field(default_factory=dict)

    @property
    def tipo_evento(self) -> str:
        if self.ing and self.ret:
            return "ingreso_y_retiro"
        if self.ing:
            return "ingreso"
        if self.ret:
            return "retiro"
        return "normal"

@dataclass(frozen=True)
class LineaCotizante:
    tipo_documento: str
    numero_documento: str
    nombre_completo: str
    tipo_cotizante: str
    subtipo_cotizante: str
    dias: Dias
    ibc_pension: Decimal
    ibc_salud: Decimal
    ibc_riesgos: Decimal
    ibc_ccf: Decimal
    tarifa_riesgos: Decimal | None
    salario_basico: Decimal | None
    novedades: Novedades
    aporte_ccf: Decimal | None = None
    aporte_arl: Decimal | None = None

@dataclass(frozen=True)
class ResultadoExtraccion:
    aportante: Aportante
    planilla: Planilla
    lineas: list[LineaCotizante]
    advertencias: list[str]

from abc import ABC, abstractmethod

class ParserBase(ABC):
    operador: str

    @abstractmethod
    def detectar(self, pdf) -> bool:
        pass

    @abstractmethod
    def extraer(self, pdf) -> ResultadoExtraccion:
        pass
