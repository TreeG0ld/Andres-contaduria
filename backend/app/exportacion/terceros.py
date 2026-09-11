import openpyxl
from sqlalchemy.orm import Session
from app.models.nomina import Carga, LineaNomina
from app.models.base import Aportante, Trabajador, Vinculo
import pandas as pd
from datetime import date
from decimal import Decimal
import os
import re

_cache_geografico = None

def calcular_dv_dian(cedula: str) -> int:
    try:
        if not cedula or not cedula.isdigit():
            return 0
        vpri = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71]
        x = sum(int(digito) * vpri[i] for i, digito in enumerate(reversed(str(cedula))))
        y = x % 11
        return 11 - y if y > 1 else y
    except:
        return 0

def mapear_tipo_identificacion(tipo_doc: str) -> str:
    # 13- Cédula de ciudadania
    # 22- Cédula de extranjería
    # 41- Pasaporte
    # 47- Permiso especial de permanencia PEP
    # 48 - Permiso proteccion temporal PPT
    tipo = tipo_doc.upper().strip()
    if tipo == "CC": return "13"
    if tipo == "CE": return "22"
    if tipo == "PA" or tipo == "PASAPORTE": return "41"
    if tipo == "PEP": return "47"
    if tipo == "PPT" or tipo == "PT": return "48"
    if tipo == "TI": return "12" # Not explicitly in image, fallback
    if tipo == "NIT": return "31"
    return "13" # default

def separar_nombres(nombre_completo: str):
    partes = nombre_completo.split()
    if len(partes) == 0:
        return "", ""
    if len(partes) == 1:
        return partes[0], ""
    if len(partes) == 2:
        return partes[0], partes[1]
    
    # 3 o más palabras: las dos primeras son apellidos, las demás son nombres
    apellidos = " ".join(partes[:2])
    nombres = " ".join(partes[2:])
    return apellidos, nombres

def get_cache_geografico():
    global _cache_geografico
    if _cache_geografico is None:
        _cache_geografico = {}
        try:
            ruta = r"D:\andresContador\Andres-contaduria\archivos extraccion de  data\Países-Departamentos-Ciudades.xlsx"
            if os.path.exists(ruta):
                # Buscar dinámicamente la fila que contiene las cabeceras
                df_temp = pd.read_excel(ruta, engine='openpyxl', header=None, nrows=20)
                header_row_idx = 0
                for idx, row in df_temp.iterrows():
                    row_str = ' '.join(str(val).lower() for val in row.values)
                    if ('código' in row_str or 'codigo' in row_str) and 'ciudad' in row_str and 'departamento' in row_str:
                        header_row_idx = idx
                        break
                
                df = pd.read_excel(ruta, engine='openpyxl', header=header_row_idx)

                import unicodedata
                def limpiar_texto(t):
                    if not isinstance(t, str): return ""
                    t = ''.join(c for c in unicodedata.normalize('NFD', t) if unicodedata.category(c) != 'Mn')
                    return t.upper().strip()
                
                cols = list(df.columns)
                # La columna del nombre es la que dice 'ciudad' pero no dice 'código'
                col_muni_nombre = next((c for c in cols if 'ciudad' in str(c).lower() and 'código' not in str(c).lower() and 'codigo' not in str(c).lower()), None)
                if not col_muni_nombre:
                    col_muni_nombre = next((c for c in cols if 'ciudad' in str(c).lower()), None)
                    
                col_muni_codigo = next((c for c in cols if 'ciudad' in str(c).lower() and ('código' in str(c).lower() or 'codigo' in str(c).lower())), None)
                
                col_depto_codigo = next((c for c in cols if 'departamento' in str(c).lower() and ('código' in str(c).lower() or 'codigo' in str(c).lower())), None)
                
                if col_muni_nombre and col_muni_codigo and col_depto_codigo:
                    for _, row in df.iterrows():
                        nombre_muni = limpiar_texto(str(row[col_muni_nombre]))
                        def clean_code(val, length):
                            if pd.isna(val): return ""
                            s = str(val).strip()
                            if s.endswith('.0'):
                                s = s[:-2]
                            return s.zfill(length)
                            
                        codigo_muni = clean_code(row[col_muni_codigo], 3)
                        codigo_depto = clean_code(row[col_depto_codigo], 2)
                        
                        if len(codigo_muni) > 3:
                            codigo_muni = codigo_muni[-3:]
                            
                        _cache_geografico[nombre_muni] = {
                            "depto": codigo_depto,
                            "ciudad": f"{codigo_depto}{codigo_muni}" if codigo_depto and codigo_muni else ""
                        }
        except Exception as e:
            print(f"Error cargando maestro geográfico: {e}")
            _cache_geografico = {}
            
    return _cache_geografico

def buscar_ciudad_en_maestro(ciudad_texto: str):
    cache = get_cache_geografico()
    import unicodedata
    ciudad = ''.join(c for c in unicodedata.normalize('NFD', ciudad_texto) if unicodedata.category(c) != 'Mn')
    ciudad = ciudad.upper().strip()
    return cache.get(ciudad, {"depto": "", "ciudad": ""})

def extraer_ciudad_direccion_de_pdf(pdf_path: str):
    import pdfplumber
    ciudad = ""
    direccion = ""
    if not pdf_path or not os.path.exists(pdf_path):
        return ciudad, direccion
        
    try:
        with pdfplumber.open(pdf_path) as pdf:
            text = pdf.pages[0].extract_text()
            
            # SOI: DIRECCIÓN: CL 40 A 30 A 07 IN 201 TELÉFONO: 4443414
            # SOI: CIUDAD/MUNICIPIO: MEDELLIN DEPARTAMENTO: ANTIOQUIA
            dir_match = re.search(r"DIRECCI.N\s*:\s*(.*?)(?:TEL.FONO|DEPARTAMENTO|\n|$)", text, re.IGNORECASE)
            if dir_match:
                direccion = dir_match.group(1).strip()
            
            ciu_match = re.search(r"CIUDAD(?:/MUNICIPIO)?\s*:\s*(.*?)(?:DEPARTAMENTO|TEL.FONO|\n|$)", text, re.IGNORECASE)
            if ciu_match:
                ciudad = ciu_match.group(1).strip()
                
            # ARUS: Documento NI901271677 Dirección CARRERA 65 A # 73 - 661
            # ARUS: Ciudad BELLO Departamento ANTIOQUIA
            if not direccion:
                dir_match2 = re.search(r"Direcci.n\s+(.*?)(?:\n|$)", text, re.IGNORECASE)
                if dir_match2:
                    direccion = dir_match2.group(1).strip()
                    
            if not ciudad:
                ciu_match2 = re.search(r"Ciudad\s+(.*?)(?:Departamento|\n|$)", text, re.IGNORECASE)
                if ciu_match2:
                    ciudad = ciu_match2.group(1).strip()
                    
            # APORTES EN LINEA: Direccion Ciudad-Departamento\n CRA 75 98 100 MEDELLIN-ANTIOQUIA
            # Very specific, so we can try looking for a city format like X-Y
            if not ciudad or not direccion:
                ael_match = re.search(r"NIT\s+\d+\s+\d+\s+.*?(?:Si|No)", text, re.IGNORECASE)
                if ael_match:
                    parts = ael_match.group(0).split()
                    if len(parts) >= 3:
                        # parts[-3] is MEDELLIN-ANTIOQUIA
                        city_dept = parts[-3].split("-")
                        if len(city_dept) >= 2:
                            ciudad = city_dept[0]
                            # Try to extract address heuristically (from 'CRA', 'CL', etc.)
                            # Since we don't know where it starts, we leave direccion empty or try to guess.
                            # Just grabbing the city is the most important for the maestro geográfico.
    except:
        pass
        
    return ciudad, direccion

def exportar_terceros(db: Session, carga_id: int) -> str:
    carga = db.query(Carga).filter(Carga.id == carga_id).first()
    if not carga:
        raise ValueError("Carga no encontrada")
        
    aportante = db.query(Aportante).filter(Aportante.id == carga.aportante_id).first()
    
    from app.core.config import settings
    from pathlib import Path
    import glob
    
    # Intentar buscar el PDF subido. La app lo guarda en uploads o un path temporal.
    # En la implementación actual de cargas.py, el pdf se guarda como NamedTemporaryFile y se elimina
    # Pero el usuario NO permite que yo cambie el extractor. La única forma de extraerlo si se elimina
    # es que modifique 'cargas.py' -> 'cargar_pdf' para que pase la dirección al Aportante, O que guarde el PDF permanentemente.
    # El usuario dijo: "opcion b autorizada, es para lo unico que tienes acceso, pero solo puedes extraer eso y no puedes tocar los archivos de los extractores"
    # Option B was "Me das permiso excepcional de agregar los campos direccion y ciudad al modelo de datos actual y enseñarle a los parsers a guardarlos en la base de datos cuando se sube el archivo."
    # The user said YES to option B but NO to modifying parsers. So they mean I can add it to the Aportante DB, and parse it in `cargas.py` when creating the Aportante!
    
    ciudad_texto = aportante.ciudad if hasattr(aportante, 'ciudad') else ""
    direccion = aportante.direccion if hasattr(aportante, 'direccion') else ""
    
    plantilla_path = r"D:\andresContador\Andres-contaduria\archivos extraccion de  data\PLANOterceros.xlsx"
    if not os.path.exists(plantilla_path):
        raise ValueError("Plantilla PLANOterceros no encontrada")
        
    wb = openpyxl.load_workbook(plantilla_path)
    ws = wb.active
    
    vinculos = db.query(Vinculo).filter(Vinculo.aportante_id == aportante.id).all()
    trabajadores = set()
    for v in vinculos:
        lineas = db.query(LineaNomina).filter(LineaNomina.carga_id == carga.id, LineaNomina.vinculo_id == v.id).count()
        if lineas > 0:
            t = db.query(Trabajador).filter(Trabajador.id == v.trabajador_id).first()
            if t:
                trabajadores.add(t)
                
    datos_geograficos = buscar_ciudad_en_maestro(ciudad_texto) if ciudad_texto else {"depto": "", "ciudad": ""}
    
    for row_idx, t in enumerate(sorted(trabajadores, key=lambda x: x.nombre_completo), start=2):
        apellidos, nombres = separar_nombres(t.nombre_completo)
        
        ws.cell(row=row_idx, column=1, value=t.numero_documento)
        ws.cell(row=row_idx, column=2, value=calcular_dv_dian(t.numero_documento))
        ws.cell(row=row_idx, column=3, value="") 
        ws.cell(row=row_idx, column=4, value=mapear_tipo_identificacion(t.tipo_documento))
        ws.cell(row=row_idx, column=5, value="Es persona")
        ws.cell(row=row_idx, column=6, value="") 
        ws.cell(row=row_idx, column=7, value=nombres) 
        ws.cell(row=row_idx, column=8, value=apellidos) 
        ws.cell(row=row_idx, column=9, value="") 
        ws.cell(row=row_idx, column=10, value=direccion) 
        ws.cell(row=row_idx, column=11, value="COL") 
        ws.cell(row=row_idx, column=12, value=datos_geograficos["depto"]) 
        ws.cell(row=row_idx, column=13, value=datos_geograficos["ciudad"]) 
    
    almacen_path = Path(settings.almacen_dir) / "exportaciones"
    almacen_path.mkdir(parents=True, exist_ok=True)
    nombre_empresa = aportante.razon_social.replace(" ", "_").replace("/", "-")
    periodo_str = carga.periodo.strftime("%Y-%m")
    
    dest_file = almacen_path / f"terceros-{nombre_empresa}-{periodo_str}.xlsx"
    wb.save(dest_file)
    
    return str(dest_file)
