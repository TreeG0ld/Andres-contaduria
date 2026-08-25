from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

from app.core.db import get_db
from app.models.config import Formula, VersionFormula

router = APIRouter()

class UpdateFormulaRequest(BaseModel):
    expresion: str
    etiqueta: Optional[str] = None

@router.get("")
def listar_formulas(db: Session = Depends(get_db)):
    active_version = db.query(VersionFormula).filter(VersionFormula.activa == True).first()
    if not active_version:
        # Fallback to get any version if no version is marked active
        active_version = db.query(VersionFormula).first()
        if not active_version:
            return []
            
    formulas = db.query(Formula).filter(Formula.version_id == active_version.id).order_by(Formula.orden).all()
    return [
        {
            "id": f.id,
            "codigo": f.codigo,
            "orden": f.orden,
            "etiqueta": f.etiqueta,
            "expresion": f.expresion,
            "version_id": f.version_id
        }
        for f in formulas
    ]

@router.post("/{formula_id}")
def actualizar_formula(
    formula_id: int,
    req: UpdateFormulaRequest,
    db: Session = Depends(get_db)
):
    formula = db.query(Formula).filter(Formula.id == formula_id).first()
    if not formula:
        raise HTTPException(status_code=404, detail="Fórmula no encontrada")
        
    formula.expresion = req.expresion
    if req.etiqueta is not None:
        formula.etiqueta = req.etiqueta
        
    db.commit()
    return {"status": "success", "mensaje": "Fórmula actualizada correctamente"}
