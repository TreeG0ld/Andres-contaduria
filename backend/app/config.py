"""
Parámetros de Ley — Colombia (PILA / Seguridad Social / Nómina).

Estos valores corresponden a los porcentajes y topes vigentes en la legislación
laboral colombiana. Se centralizan aquí porque cambian cada año (Decreto de
Salario Mínimo, Auxilio de Transporte) y porque el menú "Parámetros de Ley"
del frontend está pensado para editarlos desde un panel de administración
respaldado por base de datos en una fase futura (ver app/db/database.py).
"""

# --- Salario mínimo y auxilio de transporte (vigencia 2024, Colombia) ---
SALARIO_MINIMO_MENSUAL = 1_300_000
AUXILIO_TRANSPORTE = 162_000
# El auxilio de transporte solo aplica a trabajadores que ganan hasta 2 SMLMV.
TOPE_AUXILIO_TRANSPORTE = SALARIO_MINIMO_MENSUAL * 2

# --- Deducciones a cargo del trabajador (sobre el IBC) ---
PORC_SALUD_EMPLEADO = 0.04
PORC_PENSION_EMPLEADO = 0.04

# --- Aportes a cargo del empleador (sobre el IBC) ---
PORC_SALUD_EMPLEADOR = 0.085
PORC_PENSION_EMPLEADOR = 0.12
PORC_ARL_RIESGO_I = 0.00522  # Riesgo I (mínimo riesgo, ej. actividades administrativas)
PORC_CCF = 0.04              # Caja de Compensación Familiar

# --- Prestaciones sociales (provisiones mensuales sobre el IBC) ---
PORC_CESANTIAS = 1 / 12       # 8.33%
PORC_INTERESES_CESANTIAS = 0.12  # 12% anual, aplicado sobre la provisión de cesantías del período
PORC_PRIMA = 1 / 12           # 8.33%
PORC_VACACIONES = 1 / 24      # 4.17%

# --- Clasificación contable disponible para cada concepto (PUC Colombia) ---
# 51: Gastos de administración
# 52: Gastos de ventas
# 72: Costos de producción (mano de obra directa)
CLASIFICACIONES_CUENTA = ("51", "52", "72")
CLASIFICACION_CUENTA_DEFAULT = "51"
