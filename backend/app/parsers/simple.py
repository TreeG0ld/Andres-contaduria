import pdfplumber
import re
from datetime import date
from decimal import Decimal
from app.parsers.base import ParserBase, ResultadoExtraccion, Aportante, Planilla, LineaCotizante, Dias, Novedades

def parse_money(val: str) -> Decimal:
    if not val: return Decimal("0")
    val = val.replace("$", "").replace(".", "").replace(",", ".").replace("\n", "").strip()
    try:
        return Decimal(val)
    except:
        return Decimal("0")

class SimpleParser(ParserBase):
    operador = "simple"

    def detectar(self, pdf_path: str) -> bool:
        with pdfplumber.open(pdf_path) as pdf:
            first_page_text = pdf.pages[0].extract_text()
            return "PAGO SIMPLE" in first_page_text or "AUTOLIQUIDACION CONSOLIDADA" in first_page_text

    def extraer(self, pdf_path: str) -> ResultadoExtraccion:
        tipo_doc = "NIT"
        num_doc = "000000000"
        razon_social = "Empresa SIMPLE"
        num_planilla = "000000000"
        
        lineas = []
        advertencias = []
        
        with pdfplumber.open(pdf_path) as pdf:
            text = pdf.pages[0].extract_text()
            
            # 1. Parse Aportante Razón Social
            rs_match = re.search(r"Raz.n Social\s+([^\n]+)", text)
            if rs_match:
                razon_social = rs_match.group(1).strip()
                
            doc_match = re.search(r"Documento\s*([A-Za-z]+)?(\d+)", text)
            if doc_match:
                tipo_doc = doc_match.group(1).strip() if doc_match.group(1) else "NIT"
                num_doc = doc_match.group(2).strip()
            
            # 2. Parse Planilla
            planilla_match = re.search(r"Num.ro Planilla:\s*(\d+)", text)
            if planilla_match:
                num_planilla = planilla_match.group(1)
                
            for page in pdf.pages:
                tables = page.extract_tables()
                if not tables:
                    continue
                    
                for table in tables:
                    if not table or not table[0]: continue
                    # Buscar la tabla de cotizantes
                    header_str = " ".join([str(x) for x in table[0] if x]).lower()
                    if "datos del afiliado" in header_str and "novedades" in header_str:
                        # Saltar las filas de cabecera
                        for row in table[2:]:
                            if not row or not row[0]: continue
                            if str(row[0]).strip().isdigit() or ("CC" in str(row[0]) or "NIT" in str(row[0])):
                                doc_parts = str(row[0]).replace("\n", " ").split(" ")
                                tipo_doc_emp = doc_parts[0]
                                num_doc_emp = doc_parts[1] if len(doc_parts) > 1 else doc_parts[0]
                                nombre_emp = str(row[1] or "").replace("\n", " ").strip()
                                
                                # Novedades
                                has_ing = bool(row[4] and str(row[4]).strip()) if len(row) > 4 else False
                                has_ret = bool(row[5] and str(row[5]).strip()) if len(row) > 5 else False
                                novedades = Novedades(ing=has_ing, ret=has_ret)
                                
                                # Días
                                d_afp = int(str(row[20] or "").replace("\n", "").strip() or 0) if len(row) > 20 else 30
                                d_eps = int(str(row[21] or "").replace("\n", "").strip() or 0) if len(row) > 21 else 30
                                d_arl = int(str(row[22] or "").replace("\n", "").strip() or 0) if len(row) > 22 else 30
                                d_ccf = int(str(row[23] or "").replace("\n", "").strip() or 0) if len(row) > 23 else 30
                                dias = Dias(afp=d_afp, eps=d_eps, arp=d_arl, ccf=d_ccf)
                                
                                # IBCs
                                ibc_pen = parse_money(row[25] if len(row) > 25 else "0")
                                ibc_sal = parse_money(row[28] if len(row) > 28 else "0")
                                ibc_arl = parse_money(row[31] if len(row) > 31 else "0")
                                ibc_ccf = parse_money(row[34] if len(row) > 34 else "0")

                                # Aportes
                                ap_arl = parse_money(row[32] if len(row) > 32 else "0")
                                ap_ccf = parse_money(row[35] if len(row) > 35 else "0")

                                # Calculate Base Salary directly from IBC Salud
                                salario = ibc_sal

                                lineas.append(LineaCotizante(
                                    tipo_documento=tipo_doc_emp,
                                    numero_documento=num_doc_emp,
                                    nombre_completo=nombre_emp,
                                    tipo_cotizante="DEPEND",
                                    subtipo_cotizante="",
                                    dias=dias,
                                    ibc_pension=ibc_pen,
                                    ibc_salud=ibc_sal,
                                    ibc_riesgos=ibc_arl,
                                    ibc_ccf=ibc_ccf,
                                    tarifa_riesgos=Decimal("0"),
                                    salario_basico=salario,
                                    novedades=novedades,
                                    aporte_ccf=ap_ccf,
                                    aporte_arl=ap_arl
                                ))

        aportante = Aportante(tipo_documento=tipo_doc, numero_documento=num_doc, razon_social=razon_social, codigo_sucursal=None, exonerado=True)
        planilla = Planilla(operador="simple", numero_planilla=num_planilla, periodo_aportes=date.today(), periodo_salud=date.today(), fecha_pago=None, total_cotizantes_declarado=len(lineas))
        return ResultadoExtraccion(aportante=aportante, planilla=planilla, lineas=lineas, advertencias=advertencias)
