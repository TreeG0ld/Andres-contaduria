import sys, math
sys.path.append(r'd:\andresContador\Andres-contaduria\backend')
from app.parsers.soi import SOIParser
from app.parsers.arus import ARUSParser
from app.parsers.aportes_en_linea import AportesEnLineaParser
from app.parsers.simple import SimpleParser

def roundup(val, decimals): return math.ceil(val / (10**-decimals)) * (10**-decimals)
def rounddown(val, decimals): return math.floor(val / (10**-decimals)) * (10**-decimals)

filepath = r'D:\andresContador\Andres-contaduria\archivos extraccion de  data\DOUCE-ENERO.pdf'
parsers = [ARUSParser(), SOIParser(), AportesEnLineaParser(), SimpleParser()]

parser = None
res = None
for p in parsers:
    try:
        r = p.extraer(filepath)
        if r.lineas and len(r.lineas) > 0:
            parser = p
            res = r
            break
    except Exception:
        pass

if not res:
    print("No parser could extract data.")
    sys.exit(1)

print(f"Parser successful: {parser.operador}")
print(f"Extracted {len(res.lineas)} workers\n")

for i, l in enumerate(res.lineas):
    w = l.__dict__
    
    salario = float(w['ibc_salud'])
    aux_transporte = 8303.17 * int(w['dias'].ccf)
    
    # Pago No Salarial para los DOS primeros
    if i < 2:
        ingreso_no_sal = rounddown(salario * 0.40, -3)
    else:
        ingreso_no_sal = 0
        
    ded_salud = roundup(float(w['ibc_salud']) * 0.04, -2)
    ded_pension = roundup(float(w['ibc_pension']) * 0.04, -2)
    
    salario_por_pagar = salario + aux_transporte + ingreso_no_sal - ded_salud - ded_pension
    
    print(f"Trabajador {i+1}: {w['nombre_completo']} (CC: {w['numero_documento']})")
    print(f"  > IBC Salud: ${w['ibc_salud']:,.0f} | IBC Pension: ${w['ibc_pension']:,.0f}")
    print(f"  [Debito]  Sueldo Base (52050601): ${round(salario):,.0f}")
    print(f"  [Debito]  Aux. Transporte (52052701): ${round(aux_transporte):,.0f}")
    if ingreso_no_sal > 0:
        print(f"  [Debito]  Pago No Salarial (52059501): ${round(ingreso_no_sal):,.0f} <--- APLICADO")
    print(f"  [Credito] EPS 4% (23700501): ${round(ded_salud):,.0f}")
    print(f"  [Credito] AFP 4% (23803001): ${round(ded_pension):,.0f}")
    print(f"  [Credito] Salario por Pagar (25050101): ${round(salario_por_pagar):,.0f}")
    print("-" * 50)
