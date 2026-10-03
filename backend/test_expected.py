import re, math
import pdfplumber
from decimal import Decimal

def parse_money(m): return float(m.replace('.', '').replace(',', ''))
def roundup(val, decimals): return math.ceil(val / (10**-decimals)) * (10**-decimals)
def rounddown(val, decimals): return math.floor(val / (10**-decimals)) * (10**-decimals)

p = pdfplumber.open(r'D:\andresContador\Andres-contaduria\archivos extraccion de  data\SPS 01 ENERO_Autoliquidaciones_83256504_Consolidado.pdf')
text = p.pages[0].extract_text()
matches = list(re.finditer(r'(CC|CE|NIT|TI|PA|RC)\s+(\d+)', text))
workers = []
for i in range(len(matches)):
    start = matches[i].start()
    end = matches[i+1].start() if i + 1 < len(matches) else len(text)
    block = text[start:end]
    moneys = re.findall(r'\$\s*([\d\.\,]+)', block)
    if len(moneys) >= 13:
        match_datos = re.search(r'(\d{2})\s+(\d{2}|[A-Z0-9]+)([\sX0]*?)(\d{1,2})[\s]*(\d{1,2})[\s]*(\d{1,2})[\s]*(\d{1,2})\s*\(', block)
        name_match = re.search(rf"{matches[i].group(2)}\s+(.*?)\s+{match_datos.group(1)}", block.replace('\n', ' '))
        name = name_match.group(1).strip() if name_match else 'Unknown'
        workers.append({
            'doc': matches[i].group(2), 'name': name,
            'ibc_pen': parse_money(moneys[0]), 'ibc_sal': parse_money(moneys[2]),
            'ibc_riesgos': parse_money(moneys[4]), 'ibc_ccf': parse_money(moneys[6]),
            'ap_arl_pdf': parse_money(moneys[5]),
            'dias_ccf': int(match_datos.group(7)) if match_datos else 0
        })

print(f'--- RESULTADOS ESPERADOS (NUEVAS FORMULAS) ---')
for w in workers:
    salario = w['ibc_sal']
    aux_transporte = 8303.17 * w['dias_ccf']
    ingreso_no_sal = rounddown(salario * 0.40, -3)
    ded_salud = roundup(w['ibc_sal'] * 0.04, -2)
    ded_pension = roundup(w['ibc_pen'] * 0.04, -2)
    
    salario_por_pagar = salario + aux_transporte + ingreso_no_sal - ded_salud - ded_pension
    
    print(f"\nTrabajador: {w['name']} (CC: {w['doc']})")
    print(f"  > IBC Salud reportado: ${w['ibc_sal']:,.0f} | IBC Pension reportado: ${w['ibc_pen']:,.0f}")
    print(f"  [Debito]  Sueldo Base (52050601): ${round(salario):,.0f}")
    print(f"  [Debito]  Aux. Transporte (52052701): ${round(aux_transporte):,.0f}")
    print(f"  [Debito]  Pago No Salarial (52059501): ${round(ingreso_no_sal):,.0f}")
    print(f"  [Credito] EPS 4% (23700501): ${round(ded_salud):,.0f}")
    print(f"  [Credito] AFP 4% (23803001): ${round(ded_pension):,.0f}")
    print(f"  [Credito] Salario por Pagar (25050101): ${round(salario_por_pagar):,.0f}")
