# Contexto del proyecto

Documento de referencia para quien construya el sistema, humano o IA. Se lee **antes** de escribir código, junto con `arquitectura.md` y `riesgos-y-consideraciones.md`.

---

## 1. Qué se está construyendo

Una aplicación web de un solo usuario que automatiza un proceso contable que hoy se hace a mano.

**El proceso actual:** cada periodo llega una planilla PILA en PDF (el soporte de pago de seguridad social de una empresa). Alguien lee ese PDF, toma los datos de cada trabajador, hace 19 cálculos por persona en una hoja de cálculo, revisa que cuadre, y arma un archivo plano con la estructura fija que exige el sistema contable.

**Lo que hace el sistema:** sube el PDF, extrae los datos, corre los 19 cálculos por trabajador, muestra todo en una tabla editable para revisión, y genera el archivo plano siguiendo una plantilla configurable.

**Dos salidas distintas:**
- **Archivo de nómina** — 19 filas por trabajador, cada periodo.
- **Archivo DIAN** — las cuatro provisiones, en la liquidación.

**Contexto de uso:** una sola persona, principalmente en computador de escritorio, procesando un archivo a la vez. No es un sistema multiusuario ni de alta concurrencia. La prioridad es que los números salgan bien, no que sea rápido.

---

## 2. Glosario del dominio

Sin esto, nada del código tiene sentido.

| Término | Qué es |
|---|---|
| **PILA** | Planilla Integrada de Liquidación de Aportes. El formato colombiano para pagar seguridad social. |
| **Operador de información** | Empresa que procesa las planillas. Cada una emite el PDF con su propio diseño: SOI, Arus, Simple, Enlace Operativo. |
| **Aportante** | La empresa que paga. Identificada por NIT. |
| **Cotizante** | El trabajador. Identificado por tipo y número de documento (CC, PT, CE, TI). |
| **IBC** | Ingreso Base de Cotización. **Es el dato de entrada del que sale todo lo demás.** |
| **Días** | Días cotizados en el periodo, en meses de 30 días. Vienen separados por subsistema: AFP, EPS, ARP, CCF. |
| **Novedad** | Marca de un evento del periodo. Las relevantes son **ING** (ingreso) y **RET** (retiro): definen si el trabajador entra, sale o sigue. |
| **Vínculo** | Un periodo laboral. Una misma persona puede tener varios a lo largo del tiempo. |
| **Registro** | Código numérico que identifica al trabajador en el archivo plano. **Lo asigna el sistema**, no viene en el PDF. |
| **Clase de gasto** | Clasificación contable del trabajador (51, 52, 72). Se asigna manualmente. |
| **Archivo plano** | Archivo de texto con estructura fija que consume el sistema contable. |
| **Provisión** | Valor que se acumula para pagar después: cesantías, intereses, prima, vacaciones. |

**Reglas del negocio que definen el diseño:**

- En diciembre se retiran todos los trabajadores por cierre de año, y en enero se vuelven a vincular.
- Los ingresos ocurren en cualquier periodo; los retiros se concentran en diciembre pero pueden ocurrir en cualquier momento.
- **Un retiro puede ocurrir con muy pocos días trabajados, incluso con 1 solo día.** Este caso no es excepcional y hay que soportarlo desde el principio.
- Alguien puede entrar y salir dentro del mismo periodo: tendrá ING y RET marcados a la vez.

---

## 3. Estado del proyecto

### Definido y cerrado

- Arquitectura completa, modelo de datos, contrato de extracción.
- Los 19 conceptos, con su orden y sus códigos.
- El stack: Python + FastAPI, React + JavaScript, PostgreSQL, pdfplumber.
- La técnica de extracción de días y de novedades (secciones 6 y 7).

### Sin definir todavía

**Las 19 fórmulas.** El equipo las escribe. **Bajo ninguna circunstancia se deben inventar.** Son fórmulas de nómina colombiana con implicaciones legales y contables; una fórmula plausible pero equivocada es peor que ninguna, porque produce números creíbles que nadie va a cuestionar. Se siembran como marcadores explícitos y se reemplazan cuando lleguen.

**La estructura de los archivos planos.** No se conoce ni la de nómina ni la de DIAN. No se sabe si son de ancho fijo o delimitados, ni el orden de las columnas, ni los formatos. Esto **no bloquea el desarrollo** — ver sección 5.

**Los formatos de Arus y Simple.** No hay muestras. Ver sección 6 para el procedimiento de incorporación.

**La clase de gasto (51, 52, 72).** Se infiere que es una clasificación contable por trabajador que afecta el archivo plano. Falta confirmar con el equipo cómo se asigna y cómo entra en el mapeo.

### Muestras disponibles

| Operador | Muestra | Observaciones |
|---|---|---|
| SOI | Sí | Página 1900×1280. 16 columnas de novedad, espaciado irregular (10 a 25 px). Trae columna de salario básico. |
| Enlace Operativo | Sí | Página 842×595. 17 columnas de novedad, espaciado uniforme de 6 px. Sin columna de salario básico. |
| Arus | No | — |
| Simple | No | — |

**Ninguna muestra contiene un retiro marcado.** Toda la rama de liquidación se construirá sin caso real de prueba.

---

## 4. Reglas no negociables

Invariantes del sistema. Cualquier código que las viole está mal aunque funcione.

1. **`Decimal` para todo monto.** Nunca `float`. En base de datos, `numeric(15,2)`. En el frontend los valores viajan como texto y no se operan en JavaScript.

2. **El código es la llave; la etiqueta es decoración.** Cuatro de los 19 conceptos se llaman "Cuenta por pagar" y son cálculos independientes. Ninguna consulta, diccionario, agrupación o mapeo puede indexarse por etiqueta.

3. **Los días se leen por coordenada de carácter, con bandas.** Vienen pegados sin separador en la capa de texto. Cortar por posición de texto es incorrecto y falla con días de un solo dígito.

4. **Las cabeceras rotadas se filtran por posición vertical.** Algunos PDF traen bloques de cabecera fuera del área visible; agrupar solo por `x` produce mapas de columna corridos.

5. **ING y RET son las únicas novedades que se interpretan.** Las demás se guardan crudas. IRP no se tiene en cuenta.

6. **Un parser por operador.** Todos devuelven el contrato canónico. Fuera de `parsers/`, nada sabe qué operador generó el archivo.

7. **El periodo canónico es el mes de aportes**, no el de salud ni el de servicio.

8. **Identidad = `(tipo_documento, numero_documento)`.** Nunca el nombre, nunca el número solo.

9. **El registro lo asigna el sistema una vez y no cambia.**

10. **Los días laborales salen de CCF**, no de AFP. AFP puede ser 0 en pensionados.

11. **No derivar el salario del IBC si hay historial.** La derivación amplifica el redondeo por `30/días`; con 1 día el factor es 30.

12. **Las fórmulas viven en base de datos**, se evalúan en entorno acotado (`simpleeval` o `asteval`, nunca `eval()`), y quedan congeladas por carga.

13. **La estructura del archivo plano vive en base de datos.** Jamás en el código.

14. **Carga en orden cronológico.** No se procesa el periodo N si falta el N−1 del mismo aportante.

15. **Una carga con advertencias sin resolver no se puede exportar.**

---

## 5. Cómo avanzar sin los archivos planos

Que no se conozca la estructura de salida **no es un bloqueo**. La arquitectura está diseñada para eso: el generador no sabe nada de conceptos de negocio, solo recorre `mapeo_plantilla` y escribe.

**Qué construir mientras tanto:**

1. Implementar el generador completo soportando desde ya los dos modos posibles: **ancho fijo** (con longitud, relleno y alineación por columna) y **delimitado** (con separador configurable). Son pocas líneas más y evita reescribir.

2. Sembrar una **plantilla ficticia** con los 19 conceptos en orden, delimitada por punto y coma. Sirve para probar el flujo completo de punta a punta.

3. Implementar el **importador de plantilla desde Excel**: lee el archivo, detecta las columnas y vuelca el mapeo a la base.

4. Escribir las pruebas del generador contra la plantilla ficticia. Cuando llegue la real, las pruebas siguen sirviendo porque prueban el mecanismo, no el contenido.

**El objetivo es que el día que llegue la plantilla real, el trabajo sea cargar un Excel — no programar.**

Igual con las fórmulas: se siembra `formulas` con los 19 códigos, cada uno con una expresión marcadora evidente, y una prueba que verifique que el motor las recorre en orden, las evalúa y persiste 19 valores por trabajador.

---

## 6. Procedimiento para incorporar un operador nuevo

Procedimiento repetible para Arus, Simple, o cualquier operador futuro. El resultado es un **perfil de extracción**: un JSON que describe dónde está cada dato.

### Paso 1 — Inventario

```bash
pdfinfo muestra.pdf     # tamaño de página, productor, número de páginas
pdffonts muestra.pdf    # ¿hay capa de texto?
```

Si `pdffonts` sale vacío, el PDF es una imagen escaneada: es otro problema (OCR) y hay que reportarlo antes de seguir.

### Paso 2 — Vista humana y vista de texto

```bash
pdftoppm -png -r 150 muestra.pdf /tmp/pagina
pdftotext -layout muestra.pdf /tmp/texto.txt
```

La imagen sirve para entender la estructura visual. El texto con `-layout` para ubicar los rótulos del encabezado.

### Paso 3 — Anclar las filas de datos

El número de documento es el marcador más confiable de cada fila: está siempre, es único, y está al inicio.

```python
import re, pdfplumber

with pdfplumber.open("muestra.pdf") as pdf:
    page = pdf.pages[0]
    anclas = [w for w in page.extract_words()
              if re.fullmatch(r"\d{6,12}", w["text"]) and w["x0"] < 80]
    for a in sorted(anclas, key=lambda w: w["top"]):
        print(a["text"], round(a["top"], 1), round(a["x0"], 1))
```

De aquí salen el `top` de la primera fila, el alto de fila (diferencia entre filas consecutivas) y cuántos trabajadores hay.

### Paso 4 — Cabeceras rotadas (ING, RET y las demás novedades)

```python
from collections import defaultdict

top_primera_fila = 315.3   # del paso 3

rot = [c for c in page.chars
       if c.get("upright") is False
       and top_primera_fila - 30 < c["bottom"] < top_primera_fila]

grupos = defaultdict(list)
for c in rot:
    grupos[round(c["x0"])].append(c)

for x in sorted(grupos):
    txt = "".join(ch["text"] for ch in sorted(grupos[x], key=lambda c: -c["top"]))
    print(f"x={x}  '{txt.strip()}'")
```

**El filtro por `bottom` es obligatorio.** Sin él aparecen bloques de cabecera de otras zonas del documento —incluso fuera del área visible— y el mapa sale corrido. Verificar que el resultado tenga la cantidad de columnas esperada y que ING y RET estén al inicio.

### Paso 5 — Bandas de los días

Los días vienen pegados. Hay que descubrir las bandas de cada columna volcando los caracteres de una fila conocida:

```python
cs = [c for c in page.chars
      if abs(c["top"] - top_primera_fila) < 4 and 244 < c["x0"] < 285]
for c in sorted(cs, key=lambda c: c["x0"]):
    print(f"{c['text']}@{c['x0']:.0f}")
```

Salida típica de una fila con 30 días en los cuatro subsistemas:

```
0@249  3@254  0@256  3@260  0@262  3@266  0@268  3@272  0@274  (@278
       ──AFP──      ──EPS──      ──ARP──      ──CCF──
```

De ahí salen las bandas: `AFP [253,259]`, `EPS [259,265]`, `ARP [265,271]`, `CCF [271,277]`. **Definir siempre el borde derecho de la última banda**, o se cuela el primer carácter del campo siguiente.

Conviene verificar con una fila que tenga un valor distinto (un 0 o un número de un dígito), porque los números están alineados dentro de la celda y un dígito solo no cae en la misma posición que el primero de dos.

### Paso 6 — Bordes de celda

```python
verticales = sorted({round(l["x0"], 1) for l in page.lines
                     if abs(l["x0"] - l["x1"]) < 0.6})
print(verticales)
```

Confirma los rangos. Muchos PDF dibujan doble línea por borde: si aparecen valores en pares muy cercanos (149 y 151), el borde real está entre ellos.

### Paso 7 — Encabezado

Extracción normal sobre la banda superior, buscando los rótulos: razón social, NIT, número de planilla, los dos periodos, total de cotizantes, exoneración.

### Paso 8 — Validar

Tres verificaciones obligatorias antes de dar por bueno un perfil:

1. **Conteo:** las filas extraídas deben coincidir con el total de cotizantes del encabezado.
2. **Totales:** la suma de los aportes extraídos debe coincidir con los subtotales del PDF.
3. **Coherencia días/novedades:** días parciales sin ING ni RET, o 30 días con alguna de las dos marcada, son señales de desalineación.

Si las tres pasan, el perfil está bien. Si alguna falla, el mapa de columnas está corrido en alguna parte.

---

## 7. El perfil de extracción

Un JSON por operador, en `backend/app/parsers/perfiles/`.

```json
{
  "operador": "enlace",
  "firma": {
    "texto": "AUTOLIQUIDACION CONSOLIDADA",
    "region": [0, 0, 842, 120]
  },
  "pagina": { "ancho": 842, "alto": 595, "tolerancia": 5 },

  "encabezado": {
    "razon_social":     { "ancla": "Razón Social", "direccion": "derecha" },
    "numero_documento": { "ancla": "Documento", "direccion": "derecha" },
    "numero_planilla":  { "ancla": "Numéro Planilla", "direccion": "derecha" },
    "periodo_aportes":  { "ancla": "Periodo Cotización", "tipo": "mes_anio" },
    "periodo_salud":    { "ancla": "Periodo Servicio", "tipo": "mes_anio" },
    "total_cotizantes": { "ancla": "Total Afiliados", "tipo": "entero" },
    "exonerado":        { "regla": "aportes_sena_cero" }
  },

  "detalle": {
    "ancla_fila": { "patron": "^\\d{6,12}$", "x_max": 60 },
    "alto_fila": 12,
    "columnas": {
      "tipo_documento":   [10, 18],
      "numero_documento": [18, 60],
      "nombre_completo":  [60, 140],
      "tipo_cotizante":   [140, 148],
      "subtipo_cotizante":[148, 153]
    },
    "dias": {
      "metodo": "bandas_de_caracter",
      "bandas": {
        "afp": [253, 259],
        "eps": [259, 265],
        "arp": [265, 271],
        "ccf": [271, 277]
      }
    },
    "novedades": {
      "metodo": "cabecera_rotada",
      "banda_vertical": 30,
      "tolerancia_x": 3,
      "interpretadas": ["ING", "RET"],
      "columnas": {
        "ING": 153, "RET": 159, "RET P": 165, "TDE": 171, "TAE": 177,
        "TDP": 183, "TAP": 189, "VSP": 195, "COR": 201, "VST": 207,
        "SLN": 213, "IGE": 219, "LMA": 225, "VAC": 231, "AVP": 237,
        "VCT": 243
      }
    }
  },

  "validaciones": {
    "conteo_contra": "total_cotizantes",
    "totales": [{ "campo": "aporte_pension", "ancla": "Aportes Pensión" }]
  }
}
```

Los valores del ejemplo salieron del análisis de la muestra de Enlace Operativo y sirven de referencia, pero deben reconfirmarse con el procedimiento de la sección 6.

---

## 8. Del perfil al parser

```
parsers/
  base.py            ParserBase + dataclasses del contrato
  motor_perfil.py    motor genérico que interpreta un perfil
  coordenadas.py     leer_dias, mapa_novedades, utilidades compartidas
  descubrimiento.py  genera el borrador de un perfil nuevo
  soi.py  arus.py  simple.py  enlace.py
  perfiles/
    soi.json  arus.json  simple.json  enlace.json
```

El motor genérico cubre el caso regular: filas tabulares con columnas en posiciones fijas, días por bandas, novedades por cabecera rotada. Cada parser lo usa y **sobrescribe los métodos que necesite** cuando su PDF haga algo particular.

**No forzar todo al motor genérico.** Si un operador tiene una peculiaridad que exige lógica propia, va en su módulo. El perfil resuelve el caso común y evita repetir; el resto es código y está bien que lo sea. Un motor genérico lleno de condicionales por operador es peor que cuatro parsers separados.

`descubrimiento.py` se ejecuta contra un PDF nuevo y produce un borrador del perfil que un humano revisa. **No se confía en su salida sin pasar las tres validaciones del paso 8.**

---

## 9. Orden de construcción

Cada fase entrega algo verificable. No pasar a la siguiente sin pruebas de la anterior.

| Fase | Qué se construye | Se puede empezar |
|---|---|---|
| 0 | Docker Compose, migraciones, FastAPI arrancando, esqueleto del frontend | Ya |
| 1 | `coordenadas.py`, `descubrimiento.py`, perfil y parser de SOI, contrato canónico, pruebas con la muestra real | Ya |
| 2 | Modelo de datos, identidad, registro, máquina de estados del vínculo, ingesta con guard cronológico | Ya |
| 3 | Motor de cálculo con las 19 fórmulas sembradas como marcadores, evaluación en orden, `salario_referencia`, persistencia | Ya |
| 4 | Pantalla de revisión: tabla editable, totales por concepto, advertencias bloqueantes, marcado de campos tocados | Ya |
| 5 | Generador contra plantilla ficticia, importador desde Excel | Ya |
| 6 | Parsers de Enlace, Arus y Simple | Enlace ya; los otros al recibir muestras |
| 7 | Retiro individual, cierre anual, archivo DIAN | Al recibir una muestra con retiro |
| 8 | Reemplazo de fórmulas y plantillas reales | Al recibirlas |

Las fases 1 a 5 cubren el sistema completo de punta a punta con un operador y datos ficticios de salida. Ese es el hito importante: cuando eso funcione, lo demás es cargar datos.

---

## 10. Qué decidir y qué preguntar

**Decidir sin preguntar:** nombres de variables y funciones, organización interna de módulos, estrategia de pruebas, manejo de errores, detalles de la interfaz, librerías dentro del stack definido.

**Preguntar siempre:**

- Cualquier fórmula de nómina o provisión. **No inventar ninguna.**
- Reglas de redondeo: a cuántos decimales y con qué modo.
- Cómo se asigna la clase de gasto (51, 52, 72) y cómo entra en el archivo plano.
- Si el registro se conserva o se reasigna cuando alguien reingresa en enero.
- La estructura real de los archivos planos, cuando toque implementarla.
- Casos que las reglas actuales no cubren: un IBC en cero, un trabajador en dos sucursales, un RET sin vínculo previo.
- Interpretación de cualquier campo del PDF que no esté en el glosario.

**La regla de fondo:** este sistema produce cifras que van a contabilidad. Un número equivocado no se ve equivocado, se ve como un número. Ante la duda sobre el dominio, preguntar siempre sale más barato que suponer.
