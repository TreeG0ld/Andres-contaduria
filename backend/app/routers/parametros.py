"""
Router de Parámetros de Ley: expone y permite editar en caliente las tasas
oficiales que alimentan el motor de cálculo de los 19 conceptos.
"""

from __future__ import annotations

from fastapi import APIRouter

from app import config
from app.models.schemas import ParametrosLey

router = APIRouter(prefix="/api/parametros", tags=["Parámetros de Ley"])


def _leer_parametros() -> ParametrosLey:
    return ParametrosLey(
        salario_minimo_mensual=config.SALARIO_MINIMO_MENSUAL,
        auxilio_transporte=config.AUXILIO_TRANSPORTE,
        porc_salud_empleado=config.PORC_SALUD_EMPLEADO,
        porc_pension_empleado=config.PORC_PENSION_EMPLEADO,
        porc_salud_empleador=config.PORC_SALUD_EMPLEADOR,
        porc_pension_empleador=config.PORC_PENSION_EMPLEADOR,
        porc_arl_riesgo_i=config.PORC_ARL_RIESGO_I,
        porc_ccf=config.PORC_CCF,
        porc_cesantias=config.PORC_CESANTIAS,
        porc_intereses_cesantias=config.PORC_INTERESES_CESANTIAS,
        porc_prima=config.PORC_PRIMA,
        porc_vacaciones=config.PORC_VACACIONES,
    )


@router.get("/", response_model=ParametrosLey)
async def obtener_parametros() -> ParametrosLey:
    """Devuelve las tasas de ley actualmente en uso por el motor de cálculo."""
    return _leer_parametros()


@router.put("/", response_model=ParametrosLey)
async def actualizar_parametros(payload: ParametrosLey) -> ParametrosLey:
    """
    Actualiza en memoria las tasas de ley.

    NOTA: al no existir persistencia todavía (ver app/db/database.py), estos
    cambios viven solo mientras el proceso de FastAPI esté corriendo y se
    pierden al reiniciar el servidor. Cuando se conecte la base de datos,
    esta función deberá escribir/leer de una tabla `parametros_ley` en vez
    de mutar el módulo `config`.
    """
    config.SALARIO_MINIMO_MENSUAL = payload.salario_minimo_mensual
    config.AUXILIO_TRANSPORTE = payload.auxilio_transporte
    config.TOPE_AUXILIO_TRANSPORTE = payload.salario_minimo_mensual * 2
    config.PORC_SALUD_EMPLEADO = payload.porc_salud_empleado
    config.PORC_PENSION_EMPLEADO = payload.porc_pension_empleado
    config.PORC_SALUD_EMPLEADOR = payload.porc_salud_empleador
    config.PORC_PENSION_EMPLEADOR = payload.porc_pension_empleador
    config.PORC_ARL_RIESGO_I = payload.porc_arl_riesgo_i
    config.PORC_CCF = payload.porc_ccf
    config.PORC_CESANTIAS = payload.porc_cesantias
    config.PORC_INTERESES_CESANTIAS = payload.porc_intereses_cesantias
    config.PORC_PRIMA = payload.porc_prima
    config.PORC_VACACIONES = payload.porc_vacaciones

    return _leer_parametros()
