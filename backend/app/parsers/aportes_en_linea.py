import pdfplumber
import re
from datetime import date
from decimal import Decimal
from app.parsers.base import ParserBase, ResultadoExtraccion, Aportante, Planilla, LineaCotizante, Dias, Novedades

def parse_money(val: str) -> Decimal:
    if not val: return Decimal("0")
    # Aportes En Linea uses commas for thousands, so we remove both commas and dots
    val = val.replace("$", "").replace(".", "").replace(",", "").replace("\n", "").strip()
    try:
        return Decimal(val)
    except:
        return Decimal("0")

class AportesEnLineaParser(ParserBase):
    operador = "aportes_en_linea"

    def detectar(self, pdf_path: str) -> bool:
        with pdfplumber.open(pdf_path) as pdf:
            first_page_text = pdf.pages[0].extract_text()
            return "APORTES EN LINEA" in first_page_text or "Planilla Resumen" in first_page_text

    def extraer(self, pdf_path: str) -> ResultadoExtraccion:
        # Acumuladores
        num_doc = "000000000"
        razon_social = "Empresa Aportes"
        num_planilla = "000000000"
        
        lineas = []
        advertencias = []
        
        with pdfplumber.open(pdf_path) as pdf:
            text = pdf.pages[0].extract_text()
            
            # Parse Aportante Razón Social
            # NIT 901545485 6 SOLUCONSTRUCCIONES SAS
            rs_match = re.search(r"NIT\s+(\d+)\s+\d+\s+([A-Za-z0-s\s]+)", text)
            if rs_match:
                num_doc = rs_match.group(1)
                razon_social = rs_match.group(2).strip()
            
            # Parse Planilla
            planilla_match = re.search(r"(\d{8,12})", text)
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
                    header_str2 = " ".join([str(x) for x in table[1] if x]).lower() if len(table) > 1 else ""
                    print(f"Table header_str: {header_str}")
                    print(f"Table header_str2: {header_str2}")
                    if "novedades" in header_str or "identific" in header_str2:
                        print("Found cotizantes table!")
                        for row in table[2:]:
                            if not row or not row[0] or not row[1]: continue
                            if str(row[0]).strip().isdigit() and str(row[1]).strip() in ["CC", "CE", "PEP", "PPT", "TI", "NIT", "PA", "PE"]:
                                print(f"Valid row: {row[0]}, {row[1]}, {row[2]}")
                                tipo_doc_emp = str(row[1]).strip()
                                num_doc_emp = str(row[2]).strip()
                                nombre_emp = str(row[4] or "").replace("\n", " ").strip() if len(row) > 4 else ""
                                
                                # Novedades
                                has_ing = bool(row[5] and str(row[5]).strip()) if len(row) > 5 else False
                                has_ret = bool(row[6] and str(row[6]).strip()) if len(row) > 6 else False
                                novedades = Novedades(ing=has_ing, ret=has_ret)

                                # Días
                                d_afp = int(str(row[26] or "").replace("\n", "").strip() or 0) if len(row) > 26 else 30
                                d_eps = int(str(row[30] or "").replace("\n", "").strip() or 0) if len(row) > 30 else 30
                                d_ccf = int(str(row[36] or "").replace("\n", "").strip() or 0) if len(row) > 36 else 30
                                d_arl = int(str(row[41] or "").replace("\n", "").strip() or 0) if len(row) > 41 else 30
                                dias = Dias(afp=d_afp, eps=d_eps, arp=d_arl, ccf=d_ccf)
                                
                                # IBCs
                                ibc_pen = parse_money(row[27] if len(row) > 27 else "0")
                                ibc_sal = parse_money(row[31] if len(row) > 31 else "0")
                                ibc_ccf = parse_money(row[37] if len(row) > 37 else "0")
                                ibc_arl = parse_money(row[42] if len(row) > 42 else "0")

                                # Aportes
                                ap_ccf = parse_money(row[39] if len(row) > 39 else "0")
                                ap_arl = parse_money(row[43] if len(row) > 43 else "0")

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

        aportante = Aportante(tipo_documento="NIT", numero_documento=num_doc, razon_social=razon_social, codigo_sucursal=None, exonerado=True)
        planilla = Planilla(operador="aportes_en_linea", numero_planilla=num_planilla, periodo_aportes=date.today(), periodo_salud=date.today(), fecha_pago=None, total_cotizantes_declarado=len(lineas))
        return ResultadoExtraccion(aportante=aportante, planilla=planilla, lineas=lineas, advertencias=advertencias)
