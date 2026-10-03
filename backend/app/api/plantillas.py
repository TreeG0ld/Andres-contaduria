from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

from app.core.db import get_db
from app.models.config import Plantilla, MapeoPlantilla

router = APIRouter()

@router.get("")
def listar_plantillas(db: Session = Depends(get_db)):
    plantillas = db.query(Plantilla).all()
    res = []
    for p in plantillas:
        mapeos = db.query(MapeoPlantilla).filter(MapeoPlantilla.plantilla_id == p.id).order_by(MapeoPlantilla.posicion).all()
        res.append({
            "id": p.id,
            "nombre": p.nombre,
            "tipo": p.tipo,
            "version": p.version,
            "activa": p.activa,
            "mapeos": [
                {
                    "id": m.id,
                    "posicion": m.posicion,
                    "codigo_calculo": m.codigo_calculo,
                    "columna_destino": m.columna_destino,
                    "formato": m.formato,
                    "relleno": m.relleno
                }
                for m in mapeos
            ]
        })
    return res
