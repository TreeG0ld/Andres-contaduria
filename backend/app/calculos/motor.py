from simpleeval import simple_eval
import math
from decimal import Decimal
from app.models.nomina import LineaNomina, ValorCalculado
from app.models.config import Formula

def custom_roundup(val, places=0):
    multiplier = 10 ** places
    return math.ceil(val / multiplier) * multiplier

def custom_rounddown(val, places=0):
    multiplier = 10 ** places
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
        # Contexto basico extraido de la extraccion y base de datos
        contexto = {
            "ibc_pension": float(linea.ibc_pension),
            "ibc_salud": float(linea.ibc_salud),
            "ibc_riesgos": float(linea.ibc_riesgos),
            "ibc_ccf": float(linea.ibc_ccf),
            "dias_afp": linea.dias_afp,
            "dias_eps": linea.dias_eps,
            "dias_arp": linea.dias_arp,
            "dias_ccf": linea.dias_ccf,
            "salario_basico": float(linea.salario_basico or 0),
            "tarifa_riesgos": float(linea.tarifa_riesgos or 0),
            # Variables de novedades
            "nov_ing": linea.nov_ing,
            "nov_ret": linea.nov_ret,
            # Variables maestras/de empresa
            "exonerado": exonerado,
            "aporte_arl_crudo": float(linea.nov_crudas.get("aporte_arl", 0) if linea.nov_crudas else 0),
            "aporte_ccf_crudo": float(linea.nov_crudas.get("aporte_ccf", 0) if linea.nov_crudas else 0),
            "AUX_TRANSPORTE_DIARIO": 8303.17, # TODO: sacar de la BD si es necesario

            "APLICA_LEY_1393": True,
            "PROVISIONES_INCLUYEN_NO_SALARIAL": False,
        }
        
        resultados = []
        
        for f in self.formulas:
            try:
                # simple_eval ejecuta la expresion de forma segura
                valor = simple_eval(f.expresion, names=contexto, functions=self.functions) if f.expresion else 0
            except Exception as e:
                valor = 0
                print(f"Error evaluando formula {f.codigo}: {e}")
                
            # Guardamos en contexto para formulas subsecuentes
            contexto[f.codigo] = valor
            
            resultados.append(ValorCalculado(
                linea_id=linea.id,
                codigo=f.codigo,
                orden=f.orden,
                valor_original=Decimal(str(round(valor, 2)))
            ))
            
        return resultados

