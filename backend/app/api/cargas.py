from fastapi import APIRouter, UploadFile, File, Form, Depends
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.parsers.soi import SOIParser
from app.parsers.arus import ARUSParser
from app.parsers.simple import SimpleParser
from app.parsers.aportes_en_linea import AportesEnLineaParser
from app.models.base import Aportante, Trabajador, Vinculo
from app.models.nomina import Carga, LineaNomina, ValorCalculado
from app.calculos.motor import MotorFormulas
from datetime import date
import tempfile
import os
import shutil

router = APIRouter()

@router.post("/cargar")
async def cargar_pdf(
    pdf_file: UploadFile = File(...),
    operador: str = Form(...),
    db: Session = Depends(get_db)
):
    # Guardar archivo temporalmente
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(await pdf_file.read())
        tmp_path = tmp.name
        
    try:
        # 1. Extraccion
        if operador.lower() == "soi":
            parser = SOIParser()
        elif operador.lower() == "arus":
            parser = ARUSParser()
        elif operador.lower() == "simple":
            parser = SimpleParser()
        elif operador.lower() == "aportes_en_linea":
            parser = AportesEnLineaParser()
        else:
            return {"error": f"Operador {operador} no implementado aun"}
            
        extraccion = parser.extraer(tmp_path)
        
        # 2. Base de datos - Persistencia en Postgres/Supabase
        aportante_data = extraccion.aportante
        aportante = db.query(Aportante).filter(
            Aportante.tipo_documento == aportante_data.tipo_documento,
            Aportante.numero_documento == aportante_data.numero_documento
        ).first()
        
        if not aportante:
            aportante = Aportante(
                tipo_documento=aportante_data.tipo_documento,
                numero_documento=aportante_data.numero_documento,
                razon_social=aportante_data.razon_social,
                exonerado=aportante_data.exonerado
            )
            db.add(aportante)
            db.flush()
            
        carga_data = extraccion.planilla
        periodo = date(carga_data.periodo_aportes.year, carga_data.periodo_aportes.month, 1)
        
        # Sobrescribir carga si ya existe en este periodo
        carga = db.query(Carga).filter(
            Carga.aportante_id == aportante.id,
            Carga.periodo == periodo
        ).first()
        
        if carga:
            # Delete old lineas and their calculated values to recalculate
            lineas_viejas_ids = [l[0] for l in db.query(LineaNomina.id).filter(LineaNomina.carga_id == carga.id).all()]
            if lineas_viejas_ids:
                db.query(ValorCalculado).filter(ValorCalculado.linea_id.in_(lineas_viejas_ids)).delete(synchronize_session=False)
                db.query(LineaNomina).filter(LineaNomina.carga_id == carga.id).delete(synchronize_session=False)
            
            carga.operador = carga_data.operador
            carga.numero_planilla = carga_data.numero_planilla
            carga.estado = "cargada"

        else:
            carga = Carga(
                aportante_id=aportante.id,
                operador=carga_data.operador,
                numero_planilla=carga_data.numero_planilla,
                periodo=periodo,
                estado="cargada"
            )
            db.add(carga)
            db.flush()
            
        # Guardar trabajadores, vinculos y lineas de nomina
        for line in extraccion.lineas:
            trabajador = db.query(Trabajador).filter(
                Trabajador.tipo_documento == line.tipo_documento,
                Trabajador.numero_documento == line.numero_documento
            ).first()
            
            if not trabajador:
                trabajador = Trabajador(
                    tipo_documento=line.tipo_documento,
                    numero_documento=line.numero_documento,
                    registro=line.numero_documento,
                    nombre_completo=line.nombre_completo,
                    clase_gasto=None  # Sin clasificar por defecto
                )
                db.add(trabajador)
                db.flush()
                
            vinculo = db.query(Vinculo).filter(
                Vinculo.trabajador_id == trabajador.id,
                Vinculo.aportante_id == aportante.id
            ).first()
            
            # Calcular fechas de ingreso/retiro si vienen de novedades
            fecha_ingreso = periodo
            if line.novedades.ing:
                day_val = line.novedades.crudas.get("ING")
                if day_val and day_val.isdigit():
                    fecha_ingreso = date(periodo.year, periodo.month, int(day_val))
                    
            fecha_retiro = None
            estado_vinculo = "activo"
            if line.novedades.ret:
                day_val = line.novedades.crudas.get("RET")
                if day_val and day_val.isdigit():
                    fecha_retiro = date(periodo.year, periodo.month, int(day_val))
                    estado_vinculo = "liquidado"
                    
            if not vinculo:
                vinculo = Vinculo(
                    trabajador_id=trabajador.id,
                    aportante_id=aportante.id,
                    fecha_ingreso=fecha_ingreso,
                    fecha_retiro=fecha_retiro,
                    estado=estado_vinculo
                )
                db.add(vinculo)
                db.flush()
            else:
                if line.novedades.ret:
                    vinculo.fecha_retiro = fecha_retiro
                    vinculo.estado = estado_vinculo
                    
            # Guardar aportes crudos en nov_crudas para uso del motor de cálculo
            crudas_dict = dict(line.novedades.crudas or {})
            crudas_dict["aporte_arl"] = float(line.aporte_arl or 0)
            crudas_dict["aporte_ccf"] = float(line.aporte_ccf or 0)
            
            linea_nomina = LineaNomina(
                carga_id=carga.id,
                vinculo_id=vinculo.id,
                dias_afp=line.dias.afp,
                dias_eps=line.dias.eps,
                dias_arp=line.dias.arp,
                dias_ccf=line.dias.ccf,
                ibc_pension=line.ibc_pension,
                ibc_salud=line.ibc_salud,
                ibc_riesgos=line.ibc_riesgos,
                ibc_ccf=line.ibc_ccf,
                salario_basico=line.salario_basico,
                tarifa_riesgos=line.tarifa_riesgos,
                nov_ing=line.novedades.ing,
                nov_ret=line.novedades.ret,
                nov_crudas=crudas_dict
            )
            db.add(linea_nomina)

            
        db.commit()
        
        # 3. Calculo
        from app.models.config import VersionFormula, Formula
        from app.calculos.motor import MotorFormulas
        
        active_version = db.query(VersionFormula).filter(VersionFormula.activa == True).first()
        if active_version:
            formulas = db.query(Formula).filter(Formula.version_id == active_version.id).all()
            motor = MotorFormulas(formulas)
            
            # Obtener las líneas recién guardadas para correr los cálculos
            lineas_saved = db.query(LineaNomina).filter(LineaNomina.carga_id == carga.id).all()
            for linea_saved in lineas_saved:
                valores = motor.calcular_linea(linea_saved, exonerado=aportante.exonerado)
                for val in valores:
                    # Evitar duplicados si se vuelve a procesar
                    existing_val = db.query(ValorCalculado).filter(
                        ValorCalculado.linea_id == linea_saved.id,
                        ValorCalculado.codigo == val.codigo
                    ).first()
                    if existing_val:
                        existing_val.valor_original = val.valor_original
                    else:
                        db.add(val)
            
            carga.estado = "calculada"
            carga.version_formula_id = active_version.id
            db.commit()
        
        # 4. Siempre requerir confirmación de los NITs del aportante para evitar datos inventados
        carga.estado = "requiere_config"
        db.commit()
        return {
            "status": "needs_config",
            "carga_id": carga.id,
            "aportante": {
                "id": aportante.id,
                "razon_social": aportante.razon_social,
                "numero_documento": aportante.numero_documento,
                "nit_arl": aportante.nit_arl or "",
                "nit_ccf": aportante.nit_ccf or "",
                "nit_afp": aportante.nit_afp or ""
            }
        }
    except Exception as e:
        db.rollback()
        raise e
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


from pydantic import BaseModel

class ConfirmarNitsRequest(BaseModel):
    nit_ccf: str
    nit_arl: str

class ClasificarTrabajadoresRequest(BaseModel):
    clasificaciones: dict[int, str]

def _generar_excel_carga(db: Session, carga):
    from app.models.config import Plantilla, MapeoPlantilla, Exportacion
    from app.exportacion.generador import exportar_nomina
    from app.core.config import settings
    from pathlib import Path
    import shutil
    import os
    from datetime import date
    
    plantilla = db.query(Plantilla).filter(Plantilla.nombre == "Archivo Plano Nómina").first()
    if not plantilla:
        return
        
    mapeos = db.query(MapeoPlantilla).filter(MapeoPlantilla.plantilla_id == plantilla.id).all()
    if not mapeos:
        return
        
    temp_xlsx_path = exportar_nomina(db, carga.id, carga.periodo, mapeos)
    
    almacen_path = Path(settings.almacen_dir) / "exportaciones"
    almacen_path.mkdir(parents=True, exist_ok=True)
    
    # Nombre de archivo: nomina_{nombreempresa}_{periodo}
    from app.models.base import Aportante
    aportante = db.query(Aportante).filter(Aportante.id == carga.aportante_id).first()
    nombre_empresa = aportante.razon_social.replace(" ", "_").replace("/", "-") if aportante else "empresa"
    periodo_str = carga.periodo.strftime("%Y-%m")
    
    dest_file = almacen_path / f"nomina_{nombre_empresa}_{periodo_str}.xlsx"
    
    if os.path.exists(temp_xlsx_path):
        shutil.copy(temp_xlsx_path, dest_file)
        try:
            os.remove(temp_xlsx_path)
        except:
            pass
            
    exportacion = db.query(Exportacion).filter(
        Exportacion.carga_id == carga.id,
        Exportacion.plantilla_id == plantilla.id
    ).first()
    
    if exportacion:
        exportacion.ruta_archivo = str(dest_file)
        exportacion.generado_at = date.today()
    else:
        exportacion = Exportacion(
            carga_id=carga.id,
            plantilla_id=plantilla.id,
            ruta_archivo=str(dest_file),
            hash_archivo=f"hash_{carga.id}",
            generado_at=date.today()
        )
        db.add(exportacion)
    
    carga.estado = "procesada"
    db.commit()

@router.post("/{carga_id}/confirmar_nits")
async def confirmar_nits(
    carga_id: int,
    req: ConfirmarNitsRequest,
    db: Session = Depends(get_db)
):
    from app.models.nomina import Carga, LineaNomina
    from app.models.base import Aportante, Trabajador, Vinculo
    
    carga = db.query(Carga).filter(Carga.id == carga_id).first()
    if not carga:
        return {"error": "Carga no encontrada"}
        
    aportante = db.query(Aportante).filter(Aportante.id == carga.aportante_id).first()
    if not aportante:
        return {"error": "Aportante no encontrado"}
        
    # Guardar los NITs en el perfil de la empresa
    aportante.nit_ccf = req.nit_ccf
    aportante.nit_arl = req.nit_arl
    db.commit()
    
    # Validar si hay trabajadores sin clasificar en esta carga
    # CAMBIO: Ahora retornamos TODOS los trabajadores de la planilla, independientemente de si están clasificados
    all_workers = db.query(Trabajador).join(
        Vinculo, Vinculo.trabajador_id == Trabajador.id
    ).join(
        LineaNomina, LineaNomina.vinculo_id == Vinculo.id
    ).filter(
        LineaNomina.carga_id == carga.id
    ).distinct().all()
    
    if all_workers:
        return {
            "status": "needs_workers_classification",
            "carga_id": carga.id,
            "trabajadores": [
                {
                    "id": t.id,
                    "nombre_completo": t.nombre_completo,
                    "numero_documento": t.numero_documento,
                    "clase_gasto": t.clase_gasto
                }
                for t in all_workers
            ]
        }
        
    # Si no hay trabajadores (raro, pero posible si está vacía)
    carga.estado = "calculada"
    db.commit()
        
    return {
        "status": "success",
        "mensaje": "NITs configurados con éxito",
        "carga_id": carga.id
    }

@router.post("/{carga_id}/clasificar_trabajadores")
async def clasificar_trabajadores(
    carga_id: int,
    req: ClasificarTrabajadoresRequest,
    db: Session = Depends(get_db)
):
    from app.models.nomina import Carga
    from app.models.base import Trabajador
    
    carga = db.query(Carga).filter(Carga.id == carga_id).first()
    if not carga:
        return {"error": "Carga no encontrada"}
        
    # Guardar las clasificaciones recibidas
    for t_id, clase in req.clasificaciones.items():
        if clase in ["51", "52", "72"]:
            trabajador = db.query(Trabajador).filter(Trabajador.id == t_id).first()
            if trabajador:
                trabajador.clase_gasto = clase
    db.commit()
    
    # Cambiar estado a calculada
    carga.estado = "calculada"
    db.commit()
    
    return {
        "status": "success",
        "mensaje": "Trabajadores clasificados con éxito",
        "carga_id": carga.id
    }

@router.get("/descargar/{carga_id}")
async def descargar_excel(
    carga_id: int,
    db: Session = Depends(get_db)
):
    from app.models.config import Exportacion
    from fastapi.responses import FileResponse
    from pathlib import Path
    
    exportacion = db.query(Exportacion).filter(Exportacion.carga_id == carga_id).first()
    if not exportacion or not exportacion.ruta_archivo:
        return {"error": "Archivo de exportación no encontrado para esta carga"}
        
    path = Path(exportacion.ruta_archivo)
    if not path.exists():
        return {"error": "El archivo físico de exportación no existe"}
        
    return FileResponse(
        path=path,
        filename=path.name,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

@router.get("/historial")
def listar_historial(db: Session = Depends(get_db)):
    from app.models.nomina import Carga
    from app.models.base import Aportante
    
    cargas = db.query(Carga).order_by(Carga.periodo.desc(), Carga.id.desc()).all()
    res = []
    for c in cargas:
        aportante = db.query(Aportante).filter(Aportante.id == c.aportante_id).first()
        res.append({
            "id": c.id,
            "periodo": c.periodo.strftime("%Y-%m") if c.periodo else "",
            "estado": c.estado,
            "creado_at": c.creado_at.strftime("%Y-%m-%d") if c.creado_at else "",
            "aportante": {
                "razon_social": aportante.razon_social if aportante else "Desconocido",
                "numero_documento": aportante.numero_documento if aportante else ""
            },
            "operador": c.operador or "Desconocido",
            "ruta_descarga": f"/api/cargas/descargar/{c.id}" if c.estado == "procesada" else None
        })
    return res




