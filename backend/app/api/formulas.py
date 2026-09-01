from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.db import SessionLocal
from app.models.config import VersionFormula, Formula, MapeoPlantilla
from app.calculos.traductor import db_to_user, user_to_db, get_rule_cell

router = APIRouter()

# DB Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class FormulaUpdate(BaseModel):
    expresion: str
    etiqueta: str

@router.get("")
def list_formulas(db: Session = Depends(get_db)):
    print("API hit: list_formulas from backend/app/api/formulas.py executed successfully!")
    active_version = db.query(VersionFormula).filter(VersionFormula.activa == True).first()
    if not active_version:
        return []
    
    formulas = db.query(Formula).filter(Formula.version_id == active_version.id).order_by(Formula.orden).all()
    mapeos = db.query(MapeoPlantilla).all()
    
    # Translate all expressions to user-friendly format
    response_list = []
    for f in formulas:
        friendly_expr = ""
        try:
            friendly_expr = db_to_user(f.expresion, formulas, mapeos)
        except Exception as e:
            friendly_expr = f.expresion
            print(f"Error al traducir formula {f.codigo} a formato amigable: {e}")
            
        response_list.append({
            "id": f.id,
            "codigo": f.codigo,
            "columna": get_rule_cell(f.orden, f.codigo, mapeos),
            "orden": f.orden,
            "etiqueta": f.etiqueta,
            "expresion": friendly_expr
        })
        
    return response_list

@router.post("/{formula_id}")
def update_formula(formula_id: int, data: FormulaUpdate, db: Session = Depends(get_db)):
    formula = db.query(Formula).filter(Formula.id == formula_id).first()
    if not formula:
        raise HTTPException(status_code=404, detail="Fórmula no encontrada.")
        
    # Get all active formulas to map dependencies correctly
    formulas = db.query(Formula).filter(Formula.version_id == formula.version_id).all()
    mapeos = db.query(MapeoPlantilla).all()
    
    # Translate user-friendly expression to internal DB expression and validate
    try:
        db_expr = user_to_db(data.expresion, formulas, mapeos)
    except ValueError as e:
        return {"status": "error", "error": str(e)}
    except Exception as e:
        return {"status": "error", "error": f"Error de sintaxis en la fórmula: {str(e)}"}
        
    # Update DB fields
    formula.expresion = db_expr
    formula.etiqueta = data.etiqueta
    db.commit()
    
    return {"status": "success", "mensaje": "Fórmula guardada con éxito."}
