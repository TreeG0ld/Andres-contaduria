import sys
sys.path.append(r'd:\andresContador\Andres-contaduria\backend')
from app.parsers.simple import SimpleParser
import math

def roundup(val, decimals): return math.ceil(val / (10**-decimals)) * (10**-decimals)
def rounddown(val, decimals): return math.floor(val / (10**-decimals)) * (10**-decimals)

filepath = r'D:\andresContador\Andres-contaduria\archivos extraccion de  data\estructuraSIMPLE.pdf'
p = SimpleParser()
res = p.extraer(filepath)
print(f"Extracted {len(res.lineas)} lines")

for i, l in enumerate(res.lineas):
    w = l.__dict__
    salario = float(w['ibc_salud'])
    aux_transporte = 8303.17 * int(w['dias'].ccf)
    
    # Simulate Pago No Salarial ONLY for the first worker
    if i == 0:
        ingreso_no_sal = rounddown(salario * 0.40, -3)
    else:
        ingreso_no_sal = 0
        
    ded_salud = roundup(float(w['ibc_salud']) * 0.04, -2)
    ded_pension = roundup(float(w['ibc_pension']) * 0.04, -2)
    
    salario_por_pagar = salario + aux_transporte + ingreso_no_sal - ded_salud - ded_pension
    
    print(f"\nTrabajador {i+1}: {w['nombre_completo']} (CC: {w['numero_documento']})")
    print(f"  > IBC Salud reportado: ${w['ibc_salud']:,.0f} | IBC Pension reportado: ${w['ibc_pension']:,.0f}")
    print(f"  [Debito]  Sueldo Base (52050601): ${round(salario):,.0f}")
    print(f"  [Debito]  Aux. Transporte (52052701): ${round(aux_transporte):,.0f}")
    if ingreso_no_sal > 0:
        print(f"  [Debito]  Pago No Salarial (52059501): ${round(ingreso_no_sal):,.0f}")
    print(f"  [Credito] EPS 4% (23700501): ${round(ded_salud):,.0f}")
    print(f"  [Credito] AFP 4% (23803001): ${round(ded_pension):,.0f}")
    print(f"  [Credito] Salario por Pagar (25050101): ${round(salario_por_pagar):,.0f}")
