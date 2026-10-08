from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
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

class VersionCreate(BaseModel):
    nombre: str
    base_version_id: Optional[int] = None

@router.get("")
def list_formulas(version_id: Optional[int] = None, db: Session = Depends(get_db)):
    print(f"API hit: list_formulas from backend/app/api/formulas.py executed successfully! (version_id={version_id})")
    
    if version_id:
        target_version = db.query(VersionFormula).filter(VersionFormula.id == version_id).first()
    else:
        target_version = db.query(VersionFormula).filter(VersionFormula.activa == True).first()
        
    if not target_version:
        return []
    
    formulas = db.query(Formula).filter(Formula.version_id == target_version.id).order_by(Formula.orden).all()
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

@router.get("/versiones")
def list_versiones(db: Session = Depends(get_db)):
    versiones = db.query(VersionFormula).order_by(VersionFormula.id.desc()).all()
    return [{"id": v.id, "nombre": v.nombre, "activa": v.activa, "creado_at": v.creado_at} for v in versiones]

@router.post("/versiones")
def create_version(data: VersionCreate, db: Session = Depends(get_db)):
    if data.base_version_id:
        base_version = db.query(VersionFormula).filter(VersionFormula.id == data.base_version_id).first()
    else:
        base_version = db.query(VersionFormula).filter(VersionFormula.activa == True).first()
        
    if not base_version:
        raise HTTPException(status_code=400, detail="No hay una versión base para copiar las fórmulas.")
        
    new_version = VersionFormula(nombre=data.nombre, activa=False)
    db.add(new_version)
    db.flush()
    
    base_formulas = db.query(Formula).filter(Formula.version_id == base_version.id).all()
    for bf in base_formulas:
        new_f = Formula(
            version_id=new_version.id,
            codigo=bf.codigo,
            orden=bf.orden,
            etiqueta=bf.etiqueta,
            expresion=bf.expresion
        )
        db.add(new_f)
    db.commit()
    
    return {"status": "success", "mensaje": "Versión creada con éxito.", "version_id": new_version.id}

@router.post("/versiones/{version_id}/activar")
def activar_version(version_id: int, db: Session = Depends(get_db)):
    target = db.query(VersionFormula).filter(VersionFormula.id == version_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Versión no encontrada.")
        
    # deactivate all
    db.query(VersionFormula).update({"activa": False})
    # activate target
    target.activa = True
    db.commit()
    
    return {"status": "success", "mensaje": f"Versión '{target.nombre}' activada."}

@router.post("/{formula_id}")
def update_formula(formula_id: int, data: FormulaUpdate, db: Session = Depends(get_db)):
    formula = db.query(Formula).filter(Formula.id == formula_id).first()
    if not formula:
        raise HTTPException(status_code=404, detail="Fórmula no encontrada.")
        
    # Get all active formulas for this version to map dependencies correctly
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
