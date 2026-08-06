"""
Router de liquidación: recibe las planillas PDF y devuelve los trabajadores
con sus 19 conceptos ya calculados.

Estado actual: MOCK. La extracción real de PDF (pdfplumber / PyMuPDF) se
conectará aquí más adelante; mientras tanto se simulan 2 trabajadores con
IBC = 1.750.905 para que el frontend pueda construirse y probarse end-to-end.
"""

from __future__ import annotations

from fastapi import APIRouter, File, UploadFile

from app.models.schemas import LiquidacionResponse, Trabajador
from app.services.calculations import calcular_conceptos

router = APIRouter(prefix="/api/liquidacion", tags=["Liquidación"])

IBC_MOCK = 1_750_905.0


def _trabajador_mock(id_: str, cedula: str, nombre: str, cargo: str) -> Trabajador:
    conceptos = calcular_conceptos(salario_base=IBC_MOCK, ingreso_no_salarial=0.0)
    return Trabajador(
        id=id_,
        cedula=cedula,
        nombre_completo=nombre,
        cargo=cargo,
        salario_base=IBC_MOCK,
        fecha_ingreso=None,
        conceptos=conceptos,
    )


@router.post("/procesar", response_model=LiquidacionResponse)
async def procesar_planilla(archivo: UploadFile = File(...)) -> LiquidacionResponse:
    """
    Recibe un PDF de planilla PILA y responde con los trabajadores detectados.

    TODO (fase real de extracción):
      1. Llamar a `extraer_trabajadores_desde_pdf(await archivo.read())`
         (app/services/pdf_mapping.py) — ahí está documentado el mapeo
         campo-por-campo entre el PDF de la planilla y `Trabajador`.
      2. Por cada fila extraída, construir un `Trabajador` con su cédula,
         nombre y salario_base reales (en vez de IBC_MOCK).
      3. Antes de calcular, consultar la tabla `trabajadores` (ver
         app/db/database.py) para decidir si es un ingreso nuevo o si ya
         tiene histórico salarial.
    """
    trabajadores = [
        _trabajador_mock("1", "1010101010", "Ana María Gómez", "Analista Contable"),
        _trabajador_mock("2", "1020202020", "Carlos Andrés Ruiz", "Auxiliar Administrativo"),
    ]

    return LiquidacionResponse(
        archivo_origen=archivo.filename or "planilla.pdf",
        total_trabajadores=len(trabajadores),
        trabajadores=trabajadores,
    )
