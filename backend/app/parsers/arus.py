import pdfplumber
import re
from datetime import date
from decimal import Decimal
from app.parsers.base import ParserBase, ResultadoExtraccion, Aportante, Planilla, LineaCotizante, Dias, Novedades

MESES = {
    "enero": 1, "febrero": 2, "marzo": 3, "abril": 4,
    "mayo": 5, "junio": 6, "julio": 7, "agosto": 8,
    "septiembre": 9, "octubre": 10, "noviembre": 11, "diciembre": 12
}

def parse_money(val: str) -> Decimal:
    if not val: return Decimal("0")
    val = val.replace("$", "").replace(".", "").replace(",", ".").replace("\n", "").strip()
    try:
        return Decimal(val)
    except:
        return Decimal("0")

def parse_date(year_str, month_name) -> date:
    y = int(year_str)
    m = MESES.get(month_name.lower().strip(), 1)
    return date(y, m, 1)

def parse_tarifa(val: str) -> Decimal:
    if not val: return Decimal("0")
    val = val.replace(",", ".").replace("\n", "").strip()
    try:
        # Convert e.g. "6.960" to float/Decimal and divide by 100 to represent it as a fraction (0.0696)
        return Decimal(val) / Decimal("100")
    except:
        return Decimal("0")

class ARUSParser(ParserBase):
    operador = "arus"

    def detectar(self, pdf_path: str) -> bool:
        with pdfplumber.open(pdf_path) as pdf:
            first_page_text = pdf.pages[0].extract_text()
            return "AUTOLIQUIDACION" in first_page_text and ("Enlace Operativo" in first_page_text or "ARUS" in first_page_text)

    def extraer(self, pdf_path: str) -> ResultadoExtraccion:
        lineas = []
        advertencias = []
        
        with pdfplumber.open(pdf_path) as pdf:
            first_page = pdf.pages[0]
            text = first_page.extract_text()
            tables = first_page.extract_tables()
            
            # 1. Parse Aportante Razón Social
            razon_social_match = re.search(r"Razón\s+Social\s+([^\n]+?)\s+Nombre\s+Sucursal", text, re.IGNORECASE)
            razon_social = razon_social_match.group(1).strip() if razon_social_match else ""
            
            # Documento (mapeando NI a NIT)
            doc_match = re.search(r"Documento\s*([A-Za-z]+)?\s*(\d+)", text, re.IGNORECASE)
            tipo_doc = "NIT"
            num_doc = ""
            if doc_match:
                doc_prefix = doc_match.group(1)
                tipo_doc = "NIT" if not doc_prefix or doc_prefix.upper() in ["NI", "NIT"] else doc_prefix.upper()
                num_doc = doc_match.group(2)
                
            # Exonerado
            exonerado = False
            # Check Table 5 (totals) to see if SENA and ICBF contributions are zero
            for table in tables:
                if len(table) > 1:
                    row0 = [str(x).lower() for x in table[0] if x]
                    if any("sena" in x for x in row0) or any("icbf" in x for x in row0):
                        sena_idx = -1
                        icbf_idx = -1
                        for idx, h in enumerate(row0):
                            if "sena" in h:
                                sena_idx = idx
                            elif "icbf" in h:
                                icbf_idx = idx
                        row1 = table[1]
                        sena_val = Decimal("0")
                        icbf_val = Decimal("0")
                        if sena_idx != -1 and sena_idx < len(row1):
                            sena_val = parse_money(row1[sena_idx])
                        if icbf_idx != -1 and icbf_idx < len(row1):
                            icbf_val = parse_money(row1[icbf_idx])
                        
                        if sena_val == 0 and icbf_val == 0:
                            exonerado = True
                        break
            
            aportante = Aportante(
                tipo_documento=tipo_doc,
                numero_documento=num_doc,
                razon_social=razon_social,
                codigo_sucursal=None,
                exonerado=exonerado
            )
            
            # 2. Parse Planilla Details
            num_planilla_match = re.search(r"Planilla\s*:\s*(\d+)", text, re.IGNORECASE)
            num_planilla = num_planilla_match.group(1) if num_planilla_match else ""
            
            periodo_aportes_match = re.search(r"Periodo\s+Cotizaci.n\s*:\s*([a-zA-ZáéíóúÁÉÍÓÚñÑ]+)\s+de\s+(\d{4})", text, re.IGNORECASE)
            periodo_aportes = date.today()
            if periodo_aportes_match:
                periodo_aportes = parse_date(periodo_aportes_match.group(2), periodo_aportes_match.group(1))
                
            periodo_salud_match = re.search(r"Periodo\s+Servicio\s*:\s*([a-zA-ZáéíóúÁÉÍÓÚñÑ]+)\s+de\s+(\d{4})", text, re.IGNORECASE)
            periodo_salud = date.today()
            if periodo_salud_match:
                periodo_salud = parse_date(periodo_salud_match.group(2), periodo_salud_match.group(1))
                
            fecha_pago_match = re.search(r"PAGADO\s*(\d{2})/(\d{2})/(\d{4})", text, re.IGNORECASE)
            fecha_pago = None
            if fecha_pago_match:
                fecha_pago = date(int(fecha_pago_match.group(3)), int(fecha_pago_match.group(2)), int(fecha_pago_match.group(1)))
                
            # 3. Find Cotizantes detailed table
            cotizantes_table = None
            max_rows = 0
            for table in tables:
                if len(table) > 2:
                    row0 = [str(x).lower() for x in table[0] if x]
                    row1 = [str(x).lower() for x in table[1] if x]
                    
                    has_ident = any("identific" in x for x in row0) or any("identific" in x for x in row1)
                    has_nombres = any("nombres" in x for x in row0) or any("nombres" in x for x in row1)
                    has_pension = any("pensi" in x for x in row0) or any("pensi" in x for x in row1)
                    
                    if has_ident and has_nombres and has_pension:
                        if len(table) > max_rows:
                            cotizantes_table = table
                            max_rows = len(table)
            
            if cotizantes_table:
                # Extracción por bloques usando expresiones regulares (inmune a saltos de línea)
                pattern = r'(CC|CE|NIT|TI|PA|RC)\s+(\d+)'
                matches = list(re.finditer(pattern, text))
                
                for i in range(len(matches)):
                    start = matches[i].start()
                    end = matches[i+1].start() if i + 1 < len(matches) else len(text)
                    block = text[start:end]
                    
                    # We use regex to find the 13 money values, e.g., $ 408.545
                    moneys = re.findall(r"\$\s*([\d\.\,]+)", block)
                    
                    if len(moneys) >= 13:
                        tipo_doc_emp = matches[i].group(1).strip()
                        num_doc_emp = matches[i].group(2).strip()
                        
                        # Extraer Tipo, Subtipo, Novedades y Días
                        match_datos = re.search(r"(\d{2})\s+(\d{2}|[A-Z0-9]+)([\sX0]*?)(\d{1,2})[\s]*(\d{1,2})[\s]*(\d{1,2})[\s]*(\d{1,2})\s*\(", block)
                        
                        if match_datos:
                            tipo_cot_emp = match_datos.group(1)
                            subtipo_cot_emp = match_datos.group(2)
                            
                            novedades_str = match_datos.group(3)
                            xs = [x for x in novedades_str.split() if x == 'X']
                            has_ing = len(xs) > 0
                            has_ret = len(xs) > 1
                            
                            d_afp, d_eps, d_arl, d_ccf = map(int, match_datos.groups()[3:7])
                        else:
                            tipo_cot_emp = "01"
                            subtipo_cot_emp = "00"
                            has_ing = False
                            has_ret = False
                            d_afp, d_eps, d_arl, d_ccf = 0, 0, 0, 0
                        
                        # Parse moneys (los primeros 13 siempre corresponden al trabajador)
                        ibc_pen = parse_money(moneys[0])
                        ap_pen = parse_money(moneys[1])
                        ibc_sal = parse_money(moneys[2])
                        ap_sal = parse_money(moneys[3])
                        ibc_riesgos = parse_money(moneys[4])
                        ap_arl = parse_money(moneys[5])
                        ibc_cajas = parse_money(moneys[6])
                        ap_ccf = parse_money(moneys[7])
                        
                        dias = Dias(afp=d_afp, eps=d_eps, arp=d_arl, ccf=d_ccf)
                        
                        # Dummy for nombre_completo (Regex between doc number and tipo cotizante)
                        # Removemos saltos de línea del bloque para buscar el nombre
                        block_flat = block.replace('\n', ' ')
                        name_match = re.search(rf"{num_doc_emp}\s+(.*?)\s+{tipo_cot_emp}\s+{subtipo_cot_emp}", block_flat)
                        nombre_emp = name_match.group(1).strip() if name_match else "TRABAJADOR DESCONOCIDO"
                        
                        crudas = {}
                        novedades = Novedades(ing=has_ing, ret=has_ret, crudas=crudas)
                        
                        # Calculate Base Salary directly from IBC Salud (General Base)
                        salario = ibc_sal
                        
                        # Guardar aportes en crudas para uso del motor
                        crudas["aporte_arl"] = float(ap_arl)
                        crudas["aporte_ccf"] = float(ap_ccf)
                        
                        # Tarifa riesgos
                        tarifa_riesgos = Decimal("0")
                        
                        lineas.append(LineaCotizante(
                            tipo_documento=tipo_doc_emp,
                            numero_documento=num_doc_emp,
                            nombre_completo=nombre_emp,
                            tipo_cotizante=tipo_cot_emp,
                            subtipo_cotizante=subtipo_cot_emp,
                            dias=dias,
                            ibc_pension=ibc_pen,
                            ibc_salud=ibc_sal,
                            ibc_riesgos=ibc_riesgos,
                            ibc_ccf=ibc_cajas,
                            tarifa_riesgos=tarifa_riesgos,
                            salario_basico=salario,
                            novedades=novedades,
                            aporte_ccf=ap_ccf,
                            aporte_arl=ap_arl
                        ))
            
            planilla = Planilla(
                operador="arus",
                numero_planilla=num_planilla,
                periodo_aportes=periodo_aportes,
                periodo_salud=periodo_salud,
                fecha_pago=fecha_pago,
                total_cotizantes_declarado=len(lineas)
            )
            
        return ResultadoExtraccion(aportante=aportante, planilla=planilla, lineas=lineas, advertencias=advertencias)
