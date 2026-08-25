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
                # We skip headers (usually Row 0 and 1 are headers)
                for row in cotizantes_table[2:]:
                    # Check if the row represents an employee (first cell should contain CC/NIT/TI/PT etc.)
                    if row and row[0] and ("CC" in row[0] or "NIT" in row[0] or "TI" in row[0] or "PT" in row[0] or "CE" in row[0] or "PA" in row[0]):
                        # Document type and number
                        doc_parts = str(row[0]).strip().split(" ")
                        tipo_doc_emp = doc_parts[0].strip()
                        num_doc_emp = doc_parts[1].strip() if len(doc_parts) > 1 else doc_parts[0].strip()
                        
                        nombre_emp = str(row[1]).replace("\n", " ").strip()
                        tipo_cot_emp = str(row[2]).strip()
                        subtipo_cot_emp = str(row[3]).strip()
                        
                        # Novedades (Reversed headers)
                        # Column 4: GNI -> ING
                        # Column 5: TER -> RET
                        has_ing = bool(row[4] and row[4].strip())
                        has_ret = bool(row[5] and row[5].strip())
                        
                        mapping = {
                            4: "ING",
                            5: "RET",
                            7: "TDE",
                            8: "TAE",
                            9: "TDP",
                            10: "TAP",
                            11: "VSP",
                            12: "VST",
                            13: "SLN",
                            14: "IGE",
                            15: "LMA",
                            16: "VAC",
                            17: "AVP",
                            18: "VCT",
                            19: "IRP"
                        }
                        crudas = {}
                        for col_idx, key in mapping.items():
                            if col_idx < len(row) and row[col_idx] and str(row[col_idx]).strip():
                                val = str(row[col_idx]).strip()
                                crudas[key] = val
                                if key == "VSP":
                                    crudas["COR"] = val
                                    
                        novedades = Novedades(ing=has_ing, ret=has_ret, crudas=crudas)
                        
                        # Days
                        d_afp = int(str(row[20]).replace("\n", "").strip() or 0)
                        d_eps = int(str(row[21]).replace("\n", "").strip() or 0)
                        d_arl = int(str(row[22]).replace("\n", "").strip() or 0)
                        d_ccf = int(str(row[23]).replace("\n", "").strip() or 0)
                        dias = Dias(afp=d_afp, eps=d_eps, arp=d_arl, ccf=d_ccf)
                        
                        # IBCs
                        ibc_pen = parse_money(row[25])
                        ibc_sal = parse_money(row[28])
                        ibc_riesgos = parse_money(row[31])
                        ibc_cajas = parse_money(row[34])
                        
                        # Tarifa Riesgos
                        tarifa_riesgos = parse_tarifa(row[30])
                        
                        # Calculate Base Salary projecting it if they worked less than 30 days
                        dias_p = max(d_afp, 1)
                        if d_afp < 30 and d_afp > 0:
                            salario = (ibc_pen / Decimal(str(dias_p))) * Decimal("30")
                        else:
                            salario = ibc_pen
                            
                        # Aportes
                        ap_ccf = parse_money(row[35])
                        ap_arl = parse_money(row[32])
                        
                        # Guardar aportes en crudas para uso del motor (al igual que en SOI)
                        crudas["aporte_arl"] = float(ap_arl)
                        crudas["aporte_ccf"] = float(ap_ccf)
                        
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
