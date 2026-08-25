# Resumen de Progreso del Proyecto

Este documento contiene un resumen detallado de lo que se ha implementado, lo que está pendiente y los puntos clave a considerar en el desarrollo de la plataforma PILA y Nómina.

---

## 1. Lo que ya está funcionando (Logrado)

* **Base de Datos en Supabase (Nube):**
  * Migrado de SQLite local a PostgreSQL en Supabase.
  * Creadas y migradas las 11 tablas del sistema (`aportantes`, `trabajadores`, `cargas`, `vinculos`, `lineas_nomina`, `valores_calculados`, `formulas`, `versiones_formula`, `plantillas`, `mapeo_plantilla` y `exportaciones`) utilizando Alembic.
* **Extracción de Datos y Motor de Cálculo:**
  * Lector de PDFs multi-operador: Se cuenta con soporte de extracción para los operadores SOI (`soi.py`) y ARUS (`arus.py`). Ambos extraen automáticamente el aportante, periodo, tarifas y novedades de los cotizantes.
  * El motor evalúa de forma secuencial las 19 fórmulas y guarda los importes finales en la tabla `valores_calculados`.
* **Fórmulas y Conceptos Oficiales:**
  * Sembramos las 19 fórmulas con los nombres exactos definidos en los comentarios del Excel (ej: `SUELDO BASE`, `NOMINA POR PAGAR`, `AUXILIO DE CESANTIAS POR PAGAR`).
* **Asistente de NITs Interactivo:**
  * Si el Aportante es nuevo o no tiene asignados sus NITs de ARL, AFP o Caja de Compensación, el sistema se detiene y pide al usuario ingresarlos antes de generar el Excel.
  * Los NITs se guardan en la base de datos para no tener que volver a solicitarlos en los meses siguientes.
* **Generador de Excel (20 Filas por Empleado):**
  * Se genera el archivo Excel con exactamente 20 filas por trabajador (Fila 1: el IBC/Sueldo Base, Filas 2 a 20: los cálculos).
  * La Columna B (Consecutivo) incrementa de uno en uno por cada empleado.
* **Robustez de Sobrescritura:**
  * Se implementó el borrado en cascada para poder volver a subir el PDF de un mismo mes sin generar errores de clave foránea.

---

## 2. Lo que falta por implementar (Siguientes Pasos)

* **Scripts de Extracción para Otros Operadores (SIMPLE):**
  * Desarrollar el parser de PDF correspondiente para extraer la información de las planillas PILA emitidas por el operador SIMPLE (actualmente ya están implementados SOI y ARUS).
* **Desarrollo del Frontend (Pantallas Pendientes):**
  * **Pantalla de Revisión:** Crear la tabla interactiva que permita ver y modificar los cálculos por empleado antes de descargar el Excel final.
  * **Pantalla de Historial:** Mostrar las cargas pasadas con enlaces de descarga directa de los archivos previamente generados.
  * **Pantalla de Fórmulas:** Permitir que el contador edite las fórmulas matemáticas del sistema directamente desde la interfaz.
  * **Pantalla de Trabajadores:** Mostrar la lista de empleados y asociar su área o clase de gasto (administrativos `51`, operativos `52`, producción `72`).

* **Cálculo Automático de Novedades de Ingreso y Retiro:**
  * Crear el vínculo del cotizante si se detecta `nov_ing = True` en la planilla.
  * Si se detecta `nov_ret = True`, establecer la fecha de retiro en la tabla `vinculos` y marcar el estado como `"liquidado"`.
* **Lógica de Cuentas Contables Dinámicas (Clase de Gasto):**
  * Configurar en el generador de Excel la lógica para reemplazar el prefijo de las cuentas contables de gasto según el tipo de empleado (`51` para administración, `52` para ventas, `72` para operarios/producción) cuando el usuario lo valide.

---

## 3. Puntos Críticos a Tener en Cuenta (Reglas de Negocio)

* **Bases de Prestaciones Sociales:**
  * **Cesantías y Prima:** La base es la suma de `IBC + Auxilio de Transporte`.
  * **Vacaciones:** La base es únicamente el `IBC` (no se incluye el auxilio de transporte).
* **Exoneración de Aportes:**
  * Si la empresa es exonerada de aportes de salud (campo `exonerado` en la tabla `aportantes`), el valor final de `APORTES EPS POR PAGAR (Patronal)` debe ser obligatoriamente `$0`.
* **Estructura del Excel Plano:**
  * No modificar el orden del diario contable de 20 filas por trabajador, agrupados mediante la cédula del empleado en la columna G y ordenados de forma ascendente.
