"""
Esquemas Pydantic para la API de liquidación de PILA.

Estos modelos son el contrato entre el frontend (Vanilla JS) y el backend
(FastAPI). Cuando se conecte la persistencia (ver app/db/database.py), estos
mismos esquemas servirán como capa de validación de entrada/salida por encima
de los modelos ORM (SQLAlchemy) o de las tablas de Supabase, evitando exponer
directamente la estructura interna de la base de datos.
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field, field_validator


class ClasificacionCuenta(str, Enum):
    """Códigos PUC disponibles para clasificar cada concepto contablemente."""

    ADMINISTRACION = "51"
    VENTAS = "52"
    PRODUCCION = "72"


class Concepto(BaseModel):
    """Uno de los 19 conceptos calculados para un trabajador (ej. 'Aporte salud')."""

    id: int = Field(..., ge=1, le=19)
    nombre: str = Field(..., min_length=1, max_length=80)
    valor: float = Field(..., description="Valor monetario en COP; editable desde el frontend")
    clasificacion_cuenta: ClasificacionCuenta = Field(
        default=ClasificacionCuenta.ADMINISTRACION,
        description="Cuenta PUC a la que se imputa el concepto (51, 52 o 72)",
    )

    @field_validator("valor")
    @classmethod
    def valor_no_negativo(cls, v: float) -> float:
        if v < 0:
            raise ValueError("El valor de un concepto no puede ser negativo")
        return round(v, 2)


class Trabajador(BaseModel):
    """
    Un trabajador extraído (o simulado) de la planilla PILA.

    `cedula`, `salario_base` (IBC) y `fecha_ingreso` son los campos que, a
    futuro, se persistirán en la tabla `trabajadores` para conservar el
    historial salarial entre liquidaciones (ver app/db/database.py).
    """

    id: str = Field(..., description="Identificador temporal de fila en el frontend")
    cedula: str = Field(..., min_length=5, max_length=15, pattern=r"^\d+$")
    nombre_completo: str = Field(..., min_length=1, max_length=120)
    cargo: str = Field(default="", max_length=80)
    salario_base: float = Field(..., gt=0, description="Ingreso Base de Cotización (IBC)")
    fecha_ingreso: str | None = Field(default=None, description="ISO 8601 (YYYY-MM-DD)")
    conceptos: list[Concepto] = Field(default_factory=list, min_length=19, max_length=19)


class LiquidacionResponse(BaseModel):
    """Respuesta del endpoint de procesamiento de planillas (carga de PDFs)."""

    archivo_origen: str
    total_trabajadores: int
    trabajadores: list[Trabajador]


class ExportRequest(BaseModel):
    """Payload enviado desde el frontend, tras editar la tabla, para exportar a Excel."""

    trabajadores: list[Trabajador] = Field(..., min_length=1)
    nombre_liquidacion: str = Field(default="liquidacion_pila", max_length=100)


class ParametrosLey(BaseModel):
    """
    Tasas y valores oficiales que alimentan el motor de cálculo de los 19
    conceptos (app/services/calculations.py). Editables desde la vista
    "Parámetros de Ley" del frontend.
    """

    salario_minimo_mensual: float = Field(..., gt=0)
    auxilio_transporte: float = Field(..., ge=0)
    porc_salud_empleado: float = Field(..., ge=0, le=1)
    porc_pension_empleado: float = Field(..., ge=0, le=1)
    porc_salud_empleador: float = Field(..., ge=0, le=1)
    porc_pension_empleador: float = Field(..., ge=0, le=1)
    porc_arl_riesgo_i: float = Field(..., ge=0, le=1)
    porc_ccf: float = Field(..., ge=0, le=1)
    porc_cesantias: float = Field(..., ge=0, le=1)
    porc_intereses_cesantias: float = Field(..., ge=0, le=1)
    porc_prima: float = Field(..., ge=0, le=1)
    porc_vacaciones: float = Field(..., ge=0, le=1)
