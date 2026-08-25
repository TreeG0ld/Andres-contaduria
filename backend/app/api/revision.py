from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import date
from decimal import Decimal

from app.core.db import get_db
from app.models.nomina import Carga, LineaNomina, ValorCalculado
from app.models.base import Aportante, Trabajador, Vinculo

router = APIRouter()

class EdicionItem(BaseModel):
    valor_calculado_id: int
    valor_editado: Optional[float]

class GuardarEdicionesRequest(BaseModel):
    ediciones: List[EdicionItem]

@router.get("/{carga_id}")
def obtener_revision(carga_id: int, db: Session = Depends(get_db)):
    carga = db.query(Carga).filter(Carga.id == carga_id).first()
    if not carga:
        raise HTTPException(status_code=404, detail="Carga no encontrada")
        
    aportante = db.query(Aportante).filter(Aportante.id == carga.aportante_id).first()
    
    # Obtener todas las líneas de nómina asociadas a la carga
    lineas = db.query(LineaNomina).filter(LineaNomina.carga_id == carga.id).all()
    
    lineas_res = []
    for l in lineas:
        vinculo = db.query(Vinculo).filter(Vinculo.id == l.vinculo_id).first()
        trabajador = db.query(Trabajador).filter(Trabajador.id == vinculo.trabajador_id).first() if vinculo else None
        
        if not trabajador:
            continue
            
        valores = db.query(ValorCalculado).filter(ValorCalculado.linea_id == l.id).order_by(ValorCalculado.orden).all()
        valores_dict = {}
        for v in valores:
            valores_dict[v.codigo] = {
                "id": v.id,
                "valor_original": float(v.valor_original),
                "valor_editado": float(v.valor_editado) if v.valor_editado is not None else None,
                "valor_actual": float(v.valor_editado if v.valor_editado is not None else v.valor_original)
            }
            
        lineas_res.append({
            "linea_id": l.id,
            "trabajador": {
                "id": trabajador.id,
                "nombre_completo": trabajador.nombre_completo,
                "numero_documento": trabajador.numero_documento,
                "clase_gasto": trabajador.clase_gasto or "51"
            },
            "valores": valores_dict
        })
        
    return {
        "carga": {
            "id": carga.id,
            "periodo": carga.periodo.strftime("%Y-%m") if carga.periodo else "",
            "estado": carga.estado
        },
        "aportante": {
            "id": aportante.id if aportante else None,
            "razon_social": aportante.razon_social if aportante else "",
            "numero_documento": aportante.numero_documento if aportante else ""
        },
        "lineas": lineas_res
    }

@router.post("/guardar")
def guardar_ediciones(req: GuardarEdicionesRequest, db: Session = Depends(get_db)):
    for edit in req.ediciones:
        val = db.query(ValorCalculado).filter(ValorCalculado.id == edit.valor_calculado_id).first()
        if val:
            if edit.valor_editado is None:
                val.valor_editado = None
                val.editado_at = None
            else:
                # Truncar los decimales directamente para mantener la consistencia
                val.valor_editado = Decimal(int(edit.valor_editado))
                val.editado_at = date.today()
    db.commit()
    return {"status": "success", "mensaje": "Ediciones guardadas correctamente"}

@router.post("/{carga_id}/regenerar_excel")
def regenerar_excel(carga_id: int, db: Session = Depends(get_db)):
    from app.api.cargas import _generar_excel_carga
    carga = db.query(Carga).filter(Carga.id == carga_id).first()
    if not carga:
        raise HTTPException(status_code=404, detail="Carga no encontrada")
        
    _generar_excel_carga(db, carga)
    return {
        "status": "success",
        "mensaje": "Excel regenerado correctamente con las ediciones",
        "ruta_descarga": f"/api/cargas/descargar/{carga.id}"
    }
