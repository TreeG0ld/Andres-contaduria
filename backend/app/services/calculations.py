"""
Motor de cálculo de los 19 conceptos de nómina/PILA por trabajador.

Toda la lógica matemática vive en un único lugar para que:
  1. El endpoint de carga (mock) y, a futuro, el extractor real de PDF,
     reutilicen exactamente la misma función.
  2. Cambiar un porcentaje de ley (app/config.py) se refleje de inmediato
     en los 19 conceptos sin tocar los routers.
"""

from __future__ import annotations

from app import config

# Orden y nombres de los 19 conceptos exigidos por el negocio.
NOMBRES_CONCEPTOS: list[str] = [
    "Salario",
    "Ingreso no salarial",
    "Auxilio transporte",
    "Deducción salud",
    "Deducción pensión",
    "Salario por pagar",
    "Aporte pensión",
    "Aporte salud",
    "Aporte ARL",
    "Aporte CCF",
    "Seguridad social por pagar",
    "Provisión cesantías",
    "Cuenta por pagar (cesantías)",
    "Provisión intereses",
    "Cuenta por pagar (intereses)",
    "Provisión prima",
    "Cuenta por pagar (prima)",
    "Provisión vacaciones",
    "Cuenta por pagar (vacaciones)",
]


def calcular_conceptos(salario_base: float, ingreso_no_salarial: float = 0.0) -> list[dict]:
    """
    Deriva los 19 conceptos de nómina a partir del IBC (Ingreso Base de
    Cotización) de un trabajador.

    Devuelve una lista de dicts (id, nombre, valor, clasificacion_cuenta)
    en el mismo orden que NOMBRES_CONCEPTOS, lista para envolver en el
    esquema Pydantic `Concepto`.
    """
    ibc = salario_base

    # 1-6: Devengado y deducciones del trabajador
    salario = ibc
    aux_transporte = config.AUXILIO_TRANSPORTE if ibc <= config.TOPE_AUXILIO_TRANSPORTE else 0.0
    ded_salud = round(ibc * config.PORC_SALUD_EMPLEADO, 2)
    ded_pension = round(ibc * config.PORC_PENSION_EMPLEADO, 2)
    salario_por_pagar = round(
        salario + ingreso_no_salarial + aux_transporte - ded_salud - ded_pension, 2
    )

    # 7-11: Aportes a cargo del empleador (seguridad social)
    aporte_pension = round(ibc * config.PORC_PENSION_EMPLEADOR, 2)
    aporte_salud = round(ibc * config.PORC_SALUD_EMPLEADOR, 2)
    aporte_arl = round(ibc * config.PORC_ARL_RIESGO_I, 2)
    aporte_ccf = round(ibc * config.PORC_CCF, 2)
    seg_social_por_pagar = round(aporte_pension + aporte_salud + aporte_arl + aporte_ccf, 2)

    # 12-19: Provisiones de prestaciones sociales y sus respectivas cuentas por pagar
    prov_cesantias = round(ibc * config.PORC_CESANTIAS, 2)
    cxp_cesantias = prov_cesantias
    prov_intereses = round(prov_cesantias * config.PORC_INTERESES_CESANTIAS, 2)
    cxp_intereses = prov_intereses
    prov_prima = round(ibc * config.PORC_PRIMA, 2)
    cxp_prima = prov_prima
    prov_vacaciones = round(ibc * config.PORC_VACACIONES, 2)
    cxp_vacaciones = prov_vacaciones

    valores = [
        salario,
        ingreso_no_salarial,
        aux_transporte,
        ded_salud,
        ded_pension,
        salario_por_pagar,
        aporte_pension,
        aporte_salud,
        aporte_arl,
        aporte_ccf,
        seg_social_por_pagar,
        prov_cesantias,
        cxp_cesantias,
        prov_intereses,
        cxp_intereses,
        prov_prima,
        cxp_prima,
        prov_vacaciones,
        cxp_vacaciones,
    ]

    return [
        {
            "id": idx + 1,
            "nombre": nombre,
            "valor": valor,
            "clasificacion_cuenta": config.CLASIFICACION_CUENTA_DEFAULT,
        }
        for idx, (nombre, valor) in enumerate(zip(NOMBRES_CONCEPTOS, valores))
    ]
