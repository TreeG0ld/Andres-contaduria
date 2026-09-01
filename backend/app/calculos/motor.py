from simpleeval import simple_eval
import math
from decimal import Decimal
from app.models.nomina import LineaNomina, ValorCalculado
from app.models.config import Formula

import re

def custom_roundup(val, places=0):
    multiplier = 10 ** -places
    return math.ceil(val / multiplier) * multiplier

def custom_rounddown(val, places=0):
    multiplier = 10 ** -places
    return math.floor(val / multiplier) * multiplier

class MotorFormulas:
    def __init__(self, formulas: list[Formula]):
        self.formulas = sorted(formulas, key=lambda f: f.orden)
        self.functions = {
            "int": int,
            "ROUNDUP": custom_roundup,
            "ROUNDDOWN": custom_rounddown,
            "math": math
        }

    def calcular_linea(self, linea: LineaNomina, exonerado: bool) -> list[ValorCalculado]:
        # Contexto basico con variables maestras en mayusculas para la evaluacion limpia
        contexto = {
            "IBC_PENSION": float(linea.ibc_pension),
            "IBC_SALUD": float(linea.ibc_salud),
            "IBC_ARL": float(linea.ibc_riesgos),
            "IBC_CCF": float(linea.ibc_ccf),
            "DIAS_AFP": linea.dias_afp,
            "DIAS_EPS": linea.dias_eps,
            "DIAS_ARL": linea.dias_arp,
            "DIAS_CCF": linea.dias_ccf,
            "SALARIO_BASICO": float(linea.salario_basico or 0),
            "TARIFA_ARL": float(linea.tarifa_riesgos or 0),
            "ING": linea.nov_ing,
            "RET": linea.nov_ret,
            "EXONERADO": exonerado,
            "AUX_TRANSPORTE_DIARIO": 8303.17,
            "APORTE_ARL_PDF": float(linea.nov_crudas.get("aporte_arl", 0)) if (linea.nov_crudas and isinstance(linea.nov_crudas, dict)) else 0.0,
        }
        
        resultados = []
        
        for f in self.formulas:
            # Reemplazar brackets de orden [1] por R1 para que simple_eval los reconozca como nombres validos
            eval_expr = re.sub(r"\[(\d+)\]", r"R\1", f.expresion) if f.expresion else ""
            
            try:
                # simple_eval ejecuta la expresion de forma segura
                valor = simple_eval(eval_expr, names=contexto, functions=self.functions) if eval_expr else 0
            except Exception as e:
                valor = 0
                print(f"Error evaluando formula {f.codigo} (expresion: {eval_expr}): {e}")
                
            if f.codigo == "ingreso_no_salarial":
                aplica = linea.nov_crudas.get("aplica_no_salarial", False) if (linea.nov_crudas and isinstance(linea.nov_crudas, dict)) else False
                if not aplica:
                    valor = 0
                    
            # Truncar los decimales (eliminar la parte decimal del final)
            valor_truncado = int(valor) if valor else 0
            
            # Guardamos en contexto para formulas subsecuentes
            contexto[f"R{f.orden}"] = float(valor_truncado)
            contexto[f.codigo] = float(valor_truncado)
            
            resultados.append(ValorCalculado(
                linea_id=linea.id,
                codigo=f.codigo,
                orden=f.orden,
                valor_original=Decimal(valor_truncado)
            ))
            
        return resultados

