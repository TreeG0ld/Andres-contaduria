from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

from app.core.db import get_db
from app.models.base import Trabajador

router = APIRouter()

class UpdateTrabajadorRequest(BaseModel):
    clase_gasto: Optional[str]
    nombre_completo: Optional[str]

@router.get("")
def listar_trabajadores(db: Session = Depends(get_db)):
    workers = db.query(Trabajador).all()
    return [
        {
            "id": w.id,
            "tipo_documento": w.tipo_documento,
            "numero_documento": w.numero_documento,
            "nombre_completo": w.nombre_completo,
            "clase_gasto": w.clase_gasto or "51"
        }
        for w in workers
    ]

@router.post("/{trabajador_id}")
def actualizar_trabajador(
    trabajador_id: int,
    req: UpdateTrabajadorRequest,
    db: Session = Depends(get_db)
):
    worker = db.query(Trabajador).filter(Trabajador.id == trabajador_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Trabajador no encontrado")
        
    if req.clase_gasto is not None:
        if req.clase_gasto not in ["51", "52", "72"]:
            raise HTTPException(status_code=400, detail="Clase de gasto inválida (debe ser 51, 52 o 72)")
        worker.clase_gasto = req.clase_gasto
        
    if req.nombre_completo is not None:
        worker.nombre_completo = req.nombre_completo
        
    db.commit()
    return {"status": "success", "mensaje": "Trabajador actualizado correctamente"}
