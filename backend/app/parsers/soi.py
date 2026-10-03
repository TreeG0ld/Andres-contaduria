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

class SOIParser(ParserBase):
    operador = "soi"

    def detectar(self, pdf_path: str) -> bool:
        with pdfplumber.open(pdf_path) as pdf:
            first_page_text = pdf.pages[0].extract_text()
            return "SOI" in first_page_text or "soi" in first_page_text.lower()

    def extraer(self, pdf_path: str) -> ResultadoExtraccion:
        lineas = []
        advertencias = []
        
        with pdfplumber.open(pdf_path) as pdf:
            first_page = pdf.pages[0]
            text = first_page.extract_text()
            
            # 1. Parse Aportante
            tipo_doc_match = re.search(r"TIPO IDENTIFICACI.N:\s*([A-Z]+)", text, re.IGNORECASE)
            tipo_doc = tipo_doc_match.group(1) if tipo_doc_match else "NIT"
            
            num_doc_match = re.search(r"N.MERO DE IDENTIFICACI.N:\s*(\d+)", text, re.IGNORECASE)
            num_doc = num_doc_match.group(1) if num_doc_match else ""
            
            razon_social_match = re.search(r"NOMBRE\s+.\s+RAZ.N\s+SOCIAL:\s*([^\n]+)", text, re.IGNORECASE)
            razon_social = razon_social_match.group(1).strip() if razon_social_match else ""
            
            exonerado_match = re.search(r"APORTANTE EXONERADO PAGO APORTES[^:]*:\s*([A-Z]+)", text, re.IGNORECASE)
            exonerado = (exonerado_match.group(1) == "SI") if exonerado_match else False
            
            aportante = Aportante(
                tipo_documento=tipo_doc,
                numero_documento=num_doc,
                razon_social=razon_social,
                codigo_sucursal=None,
                exonerado=exonerado
            )
            
            # 2. Parse Planilla
            num_planilla_match = re.search(r"N.MERO\s+PLANILLA:\s*(\d+)", text, re.IGNORECASE)
            num_planilla = num_planilla_match.group(1) if num_planilla_match else ""
            
            # Periodos
            periodo_aportes_match = re.search(r"PERIODO\s+COTIZACI.N\s+OTROS\s+MES\s*([a-zA-Z]+)\s+A.O\s*(\d+)", text, re.IGNORECASE)
            periodo_aportes = date.today()
            if periodo_aportes_match:
                periodo_aportes = parse_date(periodo_aportes_match.group(2), periodo_aportes_match.group(1))
                
            periodo_salud_match = re.search(r"PERIODO\s+COTIZACI.N\s+SALUD:\s*MES\s*([a-zA-Z]+)\s+A.O\s*(\d+)", text, re.IGNORECASE)
            periodo_salud = date.today()
            if periodo_salud_match:
                periodo_salud = parse_date(periodo_salud_match.group(2), periodo_salud_match.group(1))
                
            fecha_pago_match = re.search(r"FECHA PAGO \(aaaa/mm/dd\):\s*([\d/]+)", text, re.IGNORECASE)
            fecha_pago = None
            if fecha_pago_match:
                fp_parts = fecha_pago_match.group(1).split("/")
                fecha_pago = date(int(fp_parts[0]), int(fp_parts[1]), int(fp_parts[2]))
                
            # 3. Parse Employees
            for page in pdf.pages:
                tables = page.extract_tables()
                for table in tables:
                    header = table[0] if table else None
                    header_str = str(header)
                    if "LIQUIDAC" in header_str or "DETALLADA" in header_str:
                        for row in table:
                            if row and str(row[0]).strip().isdigit():
                                if len(row) < 54:
                                    continue
                                
                                # Doc type and doc num
                                doc_parts = row[1].split("\n")
                                tipo_doc_emp = doc_parts[0].strip()
                                num_doc_emp = doc_parts[1].strip() if len(doc_parts) > 1 else doc_parts[0].strip()
                                
                                nombre_emp = row[2].replace("\n", " ").strip()
                                tipo_cot_emp = row[3].strip()
                                
                                # IBCs
                                ibc_pen = parse_money(row[29])
                                ibc_sal = parse_money(row[39])
                                ibc_riesgos = parse_money(row[45])
                                ibc_cajas = parse_money(row[49])
                                
                                # Calculate Base Salary directly from IBC Salud
                                salario = ibc_sal
                                
                                # Days
                                d_afp = int(row[28].replace("\n", "").strip() or 0)
                                d_eps = int(row[38].replace("\n", "").strip() or 0)
                                d_arl = int(row[44].replace("\n", "").strip() or 0)
                                d_ccf = int(row[48].replace("\n", "").strip() or 0)
                                dias = Dias(afp=d_afp, eps=d_eps, arp=d_arl, ccf=d_ccf)
                                
                                # IBCs
                                ibc_pen = parse_money(row[29])
                                ibc_sal = parse_money(row[39])
                                ibc_riesgos = parse_money(row[45])
                                ibc_cajas = parse_money(row[49])
                                
                                # Novedades
                                has_ing = bool(row[10] and row[10].strip())
                                has_ret = bool(row[11] and row[11].strip())
                                
                                # Collect raw novedades
                                nov_headers = ["ING", "RET", "TDE", "TAE", "TDP", "TAP", "COR", "VSP", "VST", "SLN", "IGE", "LMA", "VAC", "AVP", "VCT", "IRP", "SPECIAL"]
                                crudas = {}
                                for i, h in enumerate(nov_headers):
                                    col_idx = 10 + i
                                    if col_idx < len(row) and row[col_idx] and row[col_idx].strip():
                                        crudas[h] = row[col_idx].strip()
                                novedades = Novedades(ing=has_ing, ret=has_ret, crudas=crudas)
                                
                                # Aportes
                                ap_ccf = parse_money(row[51])
                                ap_arl = parse_money(row[47])
                                
                                lineas.append(LineaCotizante(
                                    tipo_documento=tipo_doc_emp,
                                    numero_documento=num_doc_emp,
                                    nombre_completo=nombre_emp,
                                    tipo_cotizante=tipo_cot_emp,
                                    subtipo_cotizante="",
                                    dias=dias,
                                    ibc_pension=ibc_pen,
                                    ibc_salud=ibc_sal,
                                    ibc_riesgos=ibc_riesgos,
                                    ibc_ccf=ibc_cajas,
                                    tarifa_riesgos=None,
                                    salario_basico=salario,
                                    novedades=novedades,
                                    aporte_ccf=ap_ccf,
                                    aporte_arl=ap_arl
                                ))
                                
            planilla = Planilla(
                operador="soi",
                numero_planilla=num_planilla,
                periodo_aportes=periodo_aportes,
                periodo_salud=periodo_salud,
                fecha_pago=fecha_pago,
                total_cotizantes_declarado=len(lineas)
            )
            
        return ResultadoExtraccion(aportante=aportante, planilla=planilla, lineas=lineas, advertencias=advertencias)

