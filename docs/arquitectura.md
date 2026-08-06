# Arquitectura — Procesador de planillas PILA y generador de archivos planos

## 1. Alcance

Aplicación web de un solo usuario, optimizada para computador de escritorio y usable en móvil.

**Entrada:** planillas PILA en PDF de varios operadores (SOI, Arus, Simple, Enlace Operativo).

**Salidas:**
- **Archivo plano de nómina** — 19 filas por trabajador, según plantilla Excel.
- **Archivo plano DIAN** — las cuatro provisiones, se genera en la liquidación.

**Principio rector:** del PDF solo se extrae el IBC, los días, la identificación y las novedades ING/RET. Los 19 conceptos se calculan a partir de ahí. El PDF es la fuente de datos crudos; el sistema es la fuente de la verdad calculada.

**Pantallas:** nueva carga, historial de cargas, revisión de una carga, edición de fórmulas, edición de plantillas, ficha de trabajador.

---

## 2. Stack

| Capa | Tecnología | Motivo |
|---|---|---|
| Backend | Python 3.12 + FastAPI | La lógica pesada ya es Python; validación con Pydantic |
| Frontend | React + JavaScript + Vite | Sin TypeScript, por decisión del equipo |
| Base de datos | PostgreSQL 16 | Tipo `numeric` real para dinero |
| Extracción PDF | pdfplumber | Acceso a coordenadas de carácter, indispensable |
| Plantillas Excel | openpyxl | Importar la estructura del archivo plano |
| Motor de fórmulas | simpleeval o asteval | Evaluación acotada, nunca `eval()` |
| Empaquetado | Docker Compose | Dos servicios: `api` y `db` |

**Deliberadamente ausentes:** Celery, Redis, S3/MinIO, autenticación multiusuario. Con un usuario y un PDF a la vez no aportan nada y complican el despliegue.

**Validación en el frontend:** la respuesta de la API se valida antes de entrar al estado del componente. Un campo faltante debe producir un error visible, no un `undefined` que se convierte en `0` y termina en el archivo plano.

---

## 3. Capas del sistema

```
┌────────────────────────────────────────────────┐
│ 1. Ingesta        subir PDF, elegir operador   │
│                   detectar firma, validar      │
├────────────────────────────────────────────────┤
│ 2. Extracción     parser por operador          │
│                   → contrato canónico          │
├────────────────────────────────────────────────┤
│ 3. Normalización  identidad, periodo,          │
│                   máquina de vínculos          │
├────────────────────────────────────────────────┤
│ 4. Cálculo        19 fórmulas en orden         │
│                   versión congelada            │
├────────────────────────────────────────────────┤
│ 5. Revisión       tabla editable, totales      │
│                   persistencia de ediciones    │
├────────────────────────────────────────────────┤
│ 6. Exportación    plantilla → archivo plano    │
│                   nómina y DIAN                │
└────────────────────────────────────────────────┘
```

Cada capa recibe y entrega estructuras de datos, no objetos de la capa anterior. Eso permite reprocesar desde cualquier punto sin repetir los anteriores.

---

## 4. Contrato de extracción

Es la pieza central. **Todo parser devuelve exactamente esta estructura.** Fuera de `parsers/`, nada del sistema sabe qué operador generó el archivo.

```python
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal


@dataclass(frozen=True)
class Aportante:
    tipo_documento: str              # NIT
    numero_documento: str
    razon_social: str
    codigo_sucursal: str | None
    exonerado: bool                  # Ley 1607 — salud, SENA, ICBF


@dataclass(frozen=True)
class Planilla:
    operador: str                    # soi | arus | simple | enlace
    numero_planilla: str
    periodo_aportes: date            # CANÓNICO: el mes trabajado
    periodo_salud: date              # informativo, no ordena nada
    fecha_pago: date | None
    total_cotizantes_declarado: int  # para validar el conteo


@dataclass(frozen=True)
class Dias:
    afp: int
    eps: int
    arp: int
    ccf: int

    @property
    def laborales(self) -> int:
        """Fuente de verdad de los días trabajados.

        CCF está atado a la relación laboral, no al estado pensional.
        AFP puede ser 0 en pensionados y otros subtipos.
        """
        return self.ccf


@dataclass(frozen=True)
class Novedades:
    """Solo ING y RET se interpretan: son las que definen el vínculo.

    Las demás columnas se conservan crudas, sin asignarles tipo, para
    no comprometer el contrato con supuestos no verificados.
    """
    ing: bool
    ret: bool
    crudas: dict[str, str] = field(default_factory=dict)

    @property
    def tipo_evento(self) -> str:
        if self.ing and self.ret:
            return "ingreso_y_retiro"
        if self.ing:
            return "ingreso"
        if self.ret:
            return "retiro"
        return "normal"


@dataclass(frozen=True)
class LineaCotizante:
    tipo_documento: str              # CC, PT, CE, TI
    numero_documento: str
    nombre_completo: str
    tipo_cotizante: str
    subtipo_cotizante: str
    dias: Dias
    ibc_pension: Decimal
    ibc_salud: Decimal
    ibc_riesgos: Decimal
    ibc_ccf: Decimal
    tarifa_riesgos: Decimal | None
    salario_basico: Decimal | None   # solo algunos operadores lo traen
    novedades: Novedades


@dataclass(frozen=True)
class ResultadoExtraccion:
    aportante: Aportante
    planilla: Planilla
    lineas: list[LineaCotizante]
    advertencias: list[str]          # inconsistencias detectadas, no fatales
```

### Interfaz del parser

```python
class ParserBase(ABC):
    operador: str

    @abstractmethod
    def detectar(self, pdf) -> bool:
        """¿Este PDF es de mi operador? Firma en la primera página."""

    @abstractmethod
    def extraer(self, pdf) -> ResultadoExtraccion: ...
```

El selector de operador del dashboard elige el parser. `detectar()` corre igual y avisa si no coincide con lo seleccionado — es la defensa contra procesar con el parser equivocado.

---

## 5. Extracción de los días

**Los días vienen pegados en la capa de texto, sin separador.** La extracción de palabras devuelve una sola cadena por fila:

```
'030303030'   →  AFP=30  EPS=30  ARP=30  CCF=30
'012121212'   →  AFP=12  EPS=12  ARP=12  CCF=12
'00303030'    →  AFP=0   EPS=30  ARP=30  CCF=30
```

Esa cadena **no se puede partir por texto**: `030303030` es igual de compatible con `0|30|30|30|30` que con `03|03|03|03|0`. Y con días de un solo dígito —el caso de un retiro con 1 día— la ambigüedad empeora.

**La única forma correcta es por coordenada de carácter.** Cada dígito lleva su `x0`, y cada columna ocupa una banda de unos 6 px:

```python
def leer_dias(page, top_fila, bandas):
    """bandas = {'afp': (253, 259), 'eps': (259, 265),
                 'arp': (265, 271), 'ccf': (271, 277)}"""
    chars = [c for c in page.chars
             if abs(c["top"] - top_fila) < 4 and c["text"].isdigit()]
    salida = {}
    for nombre, (xi, xf) in bandas.items():
        digitos = sorted((c for c in chars if xi <= c["x0"] < xf),
                         key=lambda c: c["x0"])
        salida[nombre] = int("".join(c["text"] for c in digitos) or 0)
    return Dias(**salida)
```

Dos detalles que importan:

- **El borde derecho de la última banda es obligatorio.** Sin él se cuela el primer carácter del campo siguiente (el paréntesis de la administradora) y el número sale corrompido.
- **Los números están alineados dentro de su celda.** Un `0` de un dígito no cae en el mismo `x0` que el primer dígito de un `30`. Por eso se usan bandas con rango, nunca la posición exacta de la cabecera.

Las bandas salen del procedimiento de descubrimiento y viven en el perfil del operador, no en el código.

---

## 6. Extracción de ING y RET

Son las dos columnas que definen si un trabajador entra, sale, o simplemente sigue. Todo el manejo de vínculos, provisiones y liquidación depende de leerlas bien.

**Son casillas marcadas con `X`**, y sus cabeceras son **texto rotado**: no aparecen con `extract_words()`. Hay que ir a `page.chars` filtrando `upright is False`.

```python
def mapa_novedades(page, top_primera_fila, banda=30):
    """Devuelve {'ING': 153.0, 'RET': 159.0, ...}"""
    rot = [c for c in page.chars
           if c.get("upright") is False
           and top_primera_fila - banda < c["bottom"] < top_primera_fila]
    grupos = defaultdict(list)
    for c in rot:
        grupos[round(c["x0"])].append(c)
    return {
        "".join(ch["text"] for ch in sorted(g, key=lambda c: -c["top"])).strip(): x
        for x, g in grupos.items()
    }
```

**El filtro por `bottom` no es opcional.** Algunos PDF contienen bloques de cabecera adicionales fuera del área visible de la página. Agrupar todos los caracteres rotados solo por `x` produce un mapa de columnas corrido: la misma `X` se lee como ING contra la cabecera real y como otra novedad contra la fantasma. No lanza excepción, no se ve raro en pantalla, y convierte un ingreso en un evento distinto.

**Validación cruzada obligatoria** después de extraer cada línea:

| Situación | Acción |
|---|---|
| días < 30 y ninguna novedad marcada | advertencia en la línea |
| días = 30 y ING o RET marcado | advertencia en la línea |
| RET marcado sin vínculo abierto | advertencia, bloquea la aprobación |
| conteo de líneas ≠ total declarado en el encabezado | error, aborta la carga |

Las advertencias no detienen el proceso: marcan la línea en la pantalla de revisión para que la persona decida. El error de conteo sí aborta, porque significa que se perdieron trabajadores.

---

## 7. Máquina de estados del vínculo

`tipo_evento` más el estado actual del trabajador determinan qué pasa. Esta tabla es la lógica completa:

| tipo_evento | ¿Vínculo abierto? | Acción |
|---|---|---|
| `normal` | sí | Agregar línea al vínculo |
| `normal` | no | Crear vínculo + advertencia (falta el mes de ingreso) |
| `ingreso` | no | Crear vínculo con `fecha_ingreso` en este periodo |
| `ingreso` | sí | Advertencia: ingreso sobre vínculo ya abierto |
| `retiro` | sí | Cerrar vínculo, marcar `liquidado`, calcular provisiones |
| `retiro` | no | Advertencia: retiro sin vínculo — no se liquida nada |
| `ingreso_y_retiro` | no | Crear y cerrar el vínculo en el mismo periodo |
| `ingreso_y_retiro` | sí | Advertencia: revisar manualmente |

`ingreso_y_retiro` no es un caso teórico: alguien que entra el día 3 y sale el día 8 tiene ambas marcas y unos pocos días. Con retiros de 1 día posibles, hay que soportarlo desde el principio.

---

## 8. Modelo de datos

```
aportantes
  id, tipo_documento, numero_documento, razon_social, exonerado
  UNIQUE (tipo_documento, numero_documento)

trabajadores                      -- la persona
  id, tipo_documento, numero_documento, registro
  nombre_completo, clase_gasto
  UNIQUE (tipo_documento, numero_documento)
  UNIQUE (registro)

vinculos                          -- el periodo laboral
  id, trabajador_id, aportante_id
  fecha_ingreso, fecha_retiro
  estado (activo | liquidado)

cargas                            -- un PDF procesado
  id, aportante_id, operador, numero_planilla
  periodo (date, primer día del mes de aportes)
  ruta_pdf, hash_archivo, estado, version_formula_id, creado_at
  UNIQUE (aportante_id, periodo)

lineas_nomina                     -- un trabajador en una carga
  id, carga_id, vinculo_id
  dias_afp, dias_eps, dias_arp, dias_ccf
  ibc_pension, ibc_salud, ibc_riesgos, ibc_ccf
  tarifa_riesgos, salario_basico
  nov_ing bool, nov_ret bool, nov_crudas jsonb
  UNIQUE (carga_id, vinculo_id)

versiones_formula
  id, nombre, activa, creado_at

formulas
  id, version_id, codigo, orden, etiqueta, expresion
  UNIQUE (version_id, codigo)
  UNIQUE (version_id, orden)

valores_calculados                -- los 19 por trabajador
  id, linea_id, codigo, orden
  valor_original numeric(15,2)
  valor_editado  numeric(15,2) NULL
  editado_at
  UNIQUE (linea_id, codigo)

plantillas
  id, nombre, tipo (nomina | dian), modo (ancho_fijo | delimitado)
  separador, version, activa

mapeo_plantilla
  id, plantilla_id, posicion
  codigo_calculo, columna_destino, formato, longitud, relleno, alineacion

exportaciones
  id, carga_id, plantilla_id, ruta_archivo, hash_archivo, generado_at
```

**Notas de diseño:**

`trabajadores` guarda la persona; `vinculos` el periodo laboral. La misma cédula puede tener varios vínculos: retiro en diciembre y reingreso en enero, o retiro en abril y regreso en agosto. Todo el historial se consulta acotado al vínculo.

`nov_ing` y `nov_ret` son columnas propias porque tienen lógica de negocio. El resto de novedades va a `nov_crudas` como JSONB, disponible sin comprometer el esquema.

`clase_gasto` en `trabajadores` es la clasificación contable del trabajador (51, 52, 72). **No viene en el PDF** — se asigna manualmente y se usa en el mapeo de exportación. *Pendiente de confirmar con el equipo.*

El `registro` lo administra el sistema. La columna consecutiva del PDF está ordenada por número de documento y se corre cada mes: no sirve como identificador.

Todos los montos son `numeric(15,2)`. Nunca `float`, nunca `real`.

No hay tabla de historial salarial ni de provisiones acumuladas: **el historial ya vive en `lineas_nomina`**.

```sql
SELECT c.periodo, l.ibc_salud, l.dias_ccf, l.salario_basico
FROM lineas_nomina l
JOIN cargas c ON c.id = l.carga_id
WHERE l.vinculo_id = :vinculo
ORDER BY c.periodo;
```

---

## 9. Catálogo de los 19 cálculos

Cuatro conceptos comparten la etiqueta "Cuenta por pagar" y **son cálculos independientes**, cada uno con su propia fórmula. Por eso `codigo` y `etiqueta` son columnas distintas, y `orden` fija la posición en el archivo plano.

| orden | codigo | etiqueta |
|---|---|---|
| 1 | `salario` | Salario |
| 2 | `ingreso_no_salarial` | Ingreso no salarial |
| 3 | `auxilio_transporte` | Auxilio transporte |
| 4 | `deduccion_salud` | Deducción salud |
| 5 | `deduccion_pension` | Deducción pensión |
| 6 | `salario_por_pagar` | Salario por pagar |
| 7 | `aporte_pension` | Aporte pensión |
| 8 | `aporte_salud` | Aporte salud |
| 9 | `aporte_arl` | Aporte ARL |
| 10 | `aporte_ccf` | Aporte CCF |
| 11 | `seguridad_social_por_pagar` | Seguridad social por pagar |
| 12 | `provision_cesantias` | Provisión cesantías |
| 13 | `cxp_cesantias` | Cuenta por pagar |
| 14 | `provision_intereses` | Provisión intereses |
| 15 | `cxp_intereses` | Cuenta por pagar |
| 16 | `provision_prima` | Provisión prima |
| 17 | `cxp_prima` | Cuenta por pagar |
| 18 | `provision_vacaciones` | Provisión vacaciones |
| 19 | `cxp_vacaciones` | Cuenta por pagar |

Los códigos son propuestos; lo que importa es que sean únicos, estables y que nunca se reutilicen aunque cambie la etiqueta. **El código es la llave en todo el sistema**; la etiqueta es solo para mostrar.

---

## 10. Motor de cálculo

### Evaluación en orden

Los 19 no son independientes: `salario_por_pagar` depende de los conceptos 1 a 5, y `seguridad_social_por_pagar` de 7 a 10.

**Se evalúan estrictamente en `orden` ascendente, y cada fórmula puede referenciar cualquier código ya calculado.** Si una fórmula referencia un código de orden mayor o igual al suyo, el motor falla de inmediato con un mensaje claro. No hay grafo de dependencias: el orden lo define quien escribe las fórmulas.

### Contexto de evaluación

```python
contexto = {
    # Datos de la línea
    "ibc_pension":     Decimal("1750905"),
    "ibc_salud":       Decimal("1750905"),
    "ibc_riesgos":     Decimal("1750905"),
    "ibc_ccf":         Decimal("1750905"),
    "dias":            {"afp": 30, "eps": 30, "arp": 30, "ccf": 30},
    "dias_laborales":  30,
    "tarifa_riesgos":  Decimal("0.0696"),
    "salario_basico":  Decimal("1750905"),

    # Contexto del aportante
    "exonerado": True,

    # Evento del periodo
    "evento": "normal",          # normal | ingreso | retiro | ingreso_y_retiro
    "es_retiro": False,

    # Contexto del vínculo
    "vinculo": {
        "fecha_ingreso":  date(2026, 3, 1),
        "fecha_retiro":   None,
        "dias_causados":  247,
        "salario_referencia": Decimal("1750905"),
        "periodos": [
            {"periodo": "2026-03", "ibc": Decimal("1750905"), "dias": 30},
            {"periodo": "2026-04", "ibc": Decimal("1750905"), "dias": 30},
        ],
    },

    # Resultados ya calculados en esta misma línea
    "calc": {"salario": Decimal("..."), "deduccion_salud": Decimal("...")},
}
```

**`periodos` es la serie completa, deliberadamente.** De la serie se puede derivar cualquier agregado que una fórmula futura pida (promedio del último trimestre, último IBC, máximo). Del agregado no se puede recuperar la serie.

### `salario_referencia`: no derivar el salario del IBC cuando hay días parciales

La derivación `salario = IBC × 30 / días` amplifica cualquier redondeo por un factor de `30/días`. Con 30 días el factor es 1; con 1 día es 30. Para un retiro de un solo día, el resultado no es confiable.

`salario_referencia` se resuelve así, en este orden:

1. `salario_basico` de la línea, si el operador lo trae.
2. El `salario_basico` del último periodo del vínculo donde `dias_laborales == 30`.
3. `ibc_ccf × 30 / dias_ccf` de la línea actual, **solo si no hay historial**, y marcando la línea como derivada para que se revise.

El historial ya está en la base de datos: usarlo es más barato y más exacto que derivar.

### Versionado

`cargas.version_formula_id` congela qué versión de fórmulas se usó. Editar las fórmulas nunca cambia retroactivamente un cálculo ya hecho. Recalcular un periodo anterior es una acción explícita y queda registrada.

### Seguridad

Las expresiones vienen de una tabla que el usuario edita. Se evalúan con `simpleeval` o `asteval` con lista blanca de funciones. `eval()` de Python permitiría ejecución arbitraria de código.

---

## 11. Estados y flujo

```
cargada → extraida → calculada → en_revision → aprobada → exportada
              ↓                       ↓
            error                 (edición)
```

Antes de procesar el periodo N se valida que exista el N−1 del mismo aportante. La fecha de ingreso de cada vínculo se deduce de la marca ING o, en su ausencia, de la primera aparición: cargar los meses fuera de orden corrompe ese dato en silencio.

El `hash_archivo` detecta si se está subiendo el mismo PDF dos veces.

Una carga con advertencias sin resolver puede calcularse y revisarse, pero **no puede aprobarse ni exportarse**.

---

## 12. Exportación

El generador no conoce ningún concepto de negocio. Lee `mapeo_plantilla`, recorre los trabajadores y escribe.

```
Para cada trabajador (ordenado por registro):
    Para cada fila de mapeo_plantilla (ordenada por posicion):
        valor = COALESCE(valor_editado, valor_original)
        aplicar formato, longitud, relleno y alineación
        escribir fila
```

**Nómina:** plantilla con 19 posiciones → `n_trabajadores × 19` filas.

**DIAN:** plantilla propia que referencia únicamente los códigos de provisión, con su propia estructura. Es otra fila en `plantillas` con su propio mapeo — cero código nuevo.

Un mismo cálculo puede aparecer en varias plantillas. Por eso la selección vive en el mapeo y no como un campo `destino` en la fórmula.

El generador soporta desde el primer día los dos modos posibles —**ancho fijo** y **delimitado**— porque la estructura real todavía no se conoce.

Cuando cambie la estructura de un archivo plano se editan filas de `mapeo_plantilla`. No se despliega código.

---

## 13. Cierre de año

En diciembre se retiran todos. Es la operación anual más pesada y necesita ser una acción explícita.

1. Se procesa la carga de diciembre → archivo plano de nómina.
2. Se ejecuta "Cierre de año": para cada vínculo `activo`, se calculan las provisiones sobre la serie completa de sus periodos y se marca `liquidado` con `fecha_retiro`.
3. Se genera el archivo DIAN.
4. En enero, quien aparezca con marca ING obtiene un vínculo nuevo.

**Idempotencia:** un vínculo `liquidado` no se vuelve a liquidar. El estado es la protección, no una comparación de fechas.

**Los retiros individuales usan el mismo camino.** Un RET en marzo dispara exactamente la misma lógica que el cierre de diciembre, sobre un solo vínculo. No son dos implementaciones: el cierre anual es un recorrido sobre la operación individual.

**Revisión masiva:** la pantalla de diciembre muestra todos los trabajadores en filas y los conceptos en columnas, con totales por concepto en la cabecera. Cuadrar el total es cómo se detecta el error; revisar celda por celda no escala a 40 liquidaciones.

---

## 14. Estructura de carpetas

```
backend/
  app/
    api/
      cargas.py  revision.py  formulas.py  plantillas.py
      exportaciones.py  trabajadores.py
    core/
      config.py  db.py  decimales.py       # una sola función de redondeo
    models/                                 # SQLAlchemy
    schemas/                                # Pydantic
    parsers/
      base.py            ParserBase + dataclasses del contrato
      motor_perfil.py    motor genérico que interpreta un perfil
      coordenadas.py     leer_dias, mapa_novedades, utilidades
      descubrimiento.py  genera el borrador de un perfil nuevo
      soi.py  arus.py  simple.py  enlace.py
      perfiles/
        soi.json  arus.json  simple.json  enlace.json
    calculos/
      motor.py  evaluador.py  contexto.py
    exportacion/
      importador_excel.py  generador.py
    servicios/
      identidad.py       trabajador + registro
      vinculos.py        máquina de estados
      cierre_anual.py
  tests/
    fixtures/                               # PDFs reales anonimizados
  alembic/

frontend/
  src/
    features/
      carga/  revision/  historial/  formulas/  plantillas/  trabajadores/
    api/                                    # cliente + validación
    components/

docker-compose.yml
```

---

## 15. Despliegue

```yaml
services:
  db:
    image: postgres:16
    volumes: [pgdata:/var/lib/postgresql/data]
  api:
    build: ./backend
    depends_on: [db]
    volumes: [./almacen:/almacen]
    ports: ["8000:8000"]
```

El frontend se compila y FastAPI lo sirve como estáticos: un solo puerto, un solo proceso.

Los PDF y los archivos generados van a disco en `./almacen`, con la ruta relativa en la base de datos. Nunca como BLOB.

`pg_dump` diario automático hacia una carpeta fuera de la máquina. Un usuario, una máquina, una base: sin respaldo, un disco dañado borra el historial salarial completo del año.
