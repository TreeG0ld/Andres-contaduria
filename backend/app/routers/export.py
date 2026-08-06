"""
Router de exportación: recibe la liquidación editada en el frontend y
devuelve un archivo .xlsx generado con Pandas.
"""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.models.schemas import ExportRequest
from app.services.export import construir_excel

router = APIRouter(prefix="/api/export", tags=["Exportación"])

EXCEL_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


@router.post("/excel")
async def exportar_excel(payload: ExportRequest) -> StreamingResponse:
    """Construye y transmite el archivo Excel final de la liquidación."""
    buffer = construir_excel(payload)

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    nombre_archivo = f"{payload.nombre_liquidacion}_{timestamp}.xlsx"

    return StreamingResponse(
        buffer,
        media_type=EXCEL_MEDIA_TYPE,
        headers={"Content-Disposition": f'attachment; filename="{nombre_archivo}"'},
    )
