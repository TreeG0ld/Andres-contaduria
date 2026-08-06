"""
Mapeo: Planilla PILA (PDF) → modelo interno (Trabajador) → columna Excel final.

Este módulo NO extrae datos reales todavía — ver el TODO en
`extraer_trabajadores_desde_pdf`. Es el contrato que deja "cableado" el resto
del sistema: en cuanto tengamos (1) un PDF real de planilla y (2) la
confirmación del cliente sobre en qué columna del Excel va cada dato, solo
falta implementar la extracción y, si aplica, reordenar
`COLUMNAS_EXPORT_EXCEL`. El cálculo de los 19 conceptos, la edición en el
frontend y la exportación ya funcionan sobre esta forma de los datos.
"""

from __future__ import annotations

# ─────────────────────────────────────────────────────────────────────────
# 1) Campos de ENCABEZADO esperados en el PDF (nivel aportante/empleador).
# ─────────────────────────────────────────────────────────────────────────
# Toda planilla PILA —sin importar el operador de información (Aportes en
# Línea, SOI, Simple, ARUS, etc.)— trae esta información en su encabezado.
# Hoy no se usa (el mock no la necesita), pero es el punto de entrada para
# cuando se persista el histórico de liquidaciones por aportante.
CAMPOS_ENCABEZADO_PDF: dict[str, str] = {
    "nit_aportante": "NIT del empleador/aportante",
    "razon_social": "Razón social o nombre del aportante",
    "tipo_planilla": "Ordinaria, corrección, complementaria, etc.",
    "periodo_pago": "Mes y año que se está liquidando (AAAA-MM)",
    "fecha_pago": "Fecha en que se realizó el pago de la planilla",
    "numero_planilla": "Número/radicado asignado por el operador PILA",
    "operador_pila": "Operador de información (ARUS, SOI, Simple, Aportes en Línea, ...)",
}

# ─────────────────────────────────────────────────────────────────────────
# 2) Campos por TRABAJADOR esperados en la tabla del PDF, y a qué atributo
#    de app/models/schemas.py::Trabajador corresponde cada uno.
# ─────────────────────────────────────────────────────────────────────────
# `campo_interno=None` = el dato existe en el PDF pero hoy no tenemos dónde
# guardarlo; llegará con la persistencia de la tabla "Trabajadores"
# (ver app/db/database.py).
CAMPOS_TRABAJADOR_PDF: list[dict[str, str | None]] = [
    {
        "campo_pdf": "Tipo de documento",
        "campo_interno": None,
        "nota": "CC, CE, PA, TI... hoy se asume siempre cédula (CC)",
    },
    {
        "campo_pdf": "Número de documento",
        "campo_interno": "cedula",
        "nota": None,
    },
    {
        "campo_pdf": "Apellidos y nombres",
        "campo_interno": "nombre_completo",
        "nota": "el PDF suele traerlos en columnas separadas; se concatenan al extraer",
    },
    {
        "campo_pdf": "Tipo/subtipo de cotizante",
        "campo_interno": None,
        "nota": "dependiente/independiente; no afecta el cálculo actual de los 19 conceptos",
    },
    {
        "campo_pdf": "IBC (Ingreso Base de Cotización)",
        "campo_interno": "salario_base",
        "nota": "dispara el cálculo de los 19 conceptos (ver app/services/calculations.py)",
    },
    {
        "campo_pdf": "Días cotizados",
        "campo_interno": None,
        "nota": "hoy el motor de cálculo asume mes completo; falta prorratear si es parcial",
    },
    {
        "campo_pdf": "Novedades (ingreso/retiro/incapacidad/vacaciones...)",
        "campo_interno": "fecha_ingreso",
        "nota": "por ahora solo se mapea la fecha de ingreso; el resto de novedades se descarta",
    },
    {
        "campo_pdf": "Cargo",
        "campo_interno": "cargo",
        "nota": "no siempre viene en la planilla PILA; puede quedar vacío",
    },
]

# ─────────────────────────────────────────────────────────────────────────
# 3) Columnas del Excel final, en el orden en que se exportan hoy
#    (ver app/services/export.py). Centralizado aquí para que reordenar o
#    renombrar columnas sea un cambio de una sola línea cuando el cliente
#    confirme el layout exacto que necesita.
# ─────────────────────────────────────────────────────────────────────────
COLUMNAS_EXPORT_EXCEL: dict[str, str] = {
    "cedula": "Cédula",
    "nombre_completo": "Nombre completo",
    "cargo": "Cargo",
    "salario_base": "Salario base (IBC)",
    "concepto_nombre": "Concepto",
    "concepto_valor": "Valor",
    "concepto_clasificacion": "Clasificación de cuenta",
}


def extraer_trabajadores_desde_pdf(contenido_pdf: bytes) -> list[dict]:
    """
    Punto de conexión para la extracción REAL de la planilla PILA. Hoy no se
    invoca desde ningún router — `app/routers/liquidacion.py` sigue
    devolviendo el mock de 2 trabajadores.

    TODO al implementar la extracción real:
      1. Detectar si el PDF es texto nativo o una imagen escaneada.
      2. Texto nativo → pdfplumber (`pdfplumber.open`) para localizar la
         tabla de trabajadores por sus encabezados de columna.
      3. Escaneado → pasar por OCR (ej. pytesseract) antes de parsear.
      4. Por cada fila detectada, construir un dict usando las claves
         `campo_interno` de CAMPOS_TRABAJADOR_PDF y pasarlo a
         `Trabajador(**dict)` seguido de `calcular_conceptos(...)`.
      5. Si el PDF trae varias páginas/aportantes, agregar aquí el
         encabezado (CAMPOS_ENCABEZADO_PDF) para poblar `archivo_origen`
         y, a futuro, la tabla `liquidaciones`.
    """
    raise NotImplementedError(
        "Extracción real de PDF pendiente — ver TODO en el docstring de esta función. "
        "Mientras tanto, app/routers/liquidacion.py responde con datos mock."
    )
