"""
Exportación de la liquidación editada a un archivo Excel (.xlsx) con Pandas.
"""

from __future__ import annotations

import io

import pandas as pd

from app.models.schemas import ExportRequest
from app.services.pdf_mapping import COLUMNAS_EXPORT_EXCEL


def construir_excel(payload: ExportRequest) -> io.BytesIO:
    """
    Convierte la liquidación (trabajadores + sus 19 conceptos, ya editados
    en el frontend) en un DataFrame "largo" y lo serializa a un buffer .xlsx
    en memoria, listo para transmitirse por StreamingResponse.

    Los encabezados de columna vienen de COLUMNAS_EXPORT_EXCEL
    (app/services/pdf_mapping.py): cuando el cliente confirme el layout
    exacto que necesita, reordenar/renombrar ahí es suficiente — no hay que
    tocar esta función.
    """
    filas = []
    for trabajador in payload.trabajadores:
        for concepto in trabajador.conceptos:
            filas.append(
                {
                    COLUMNAS_EXPORT_EXCEL["cedula"]: trabajador.cedula,
                    COLUMNAS_EXPORT_EXCEL["nombre_completo"]: trabajador.nombre_completo,
                    COLUMNAS_EXPORT_EXCEL["cargo"]: trabajador.cargo,
                    COLUMNAS_EXPORT_EXCEL["salario_base"]: trabajador.salario_base,
                    COLUMNAS_EXPORT_EXCEL["concepto_nombre"]: concepto.nombre,
                    COLUMNAS_EXPORT_EXCEL["concepto_valor"]: concepto.valor,
                    COLUMNAS_EXPORT_EXCEL["concepto_clasificacion"]: concepto.clasificacion_cuenta.value,
                }
            )

    df = pd.DataFrame(filas)

    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Liquidación")

        worksheet = writer.sheets["Liquidación"]
        for column_cells in worksheet.columns:
            longitud = max(len(str(cell.value)) for cell in column_cells if cell.value is not None)
            worksheet.column_dimensions[column_cells[0].column_letter].width = min(longitud + 4, 45)

    buffer.seek(0)
    return buffer
