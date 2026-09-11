import React, { useState, useEffect } from 'react';
import Aviso from '../../components/Aviso';
import Selector from '../../components/ui/Selector';
import BotonAccion from '../../components/ui/BotonAccion';
import Tooltip from '../../components/ui/Tooltip';
import {
  IconoSubida,
  IconoPdf,
  IconoCerrar,
  IconoExcel,
  IconoDescarga,
  IconoCandado,
} from '../../components/iconos';
import './PantallaCarga.css';

const OPERADORES = [
  { valor: 'soi', etiqueta: 'SOI (Planilla de Aportes)' },
  { valor: 'arus', etiqueta: 'ARUS' },
  { valor: 'simple', etiqueta: 'SIMPLE' },
  { valor: 'aportes_en_linea', etiqueta: 'APORTES EN LINEA' },
];

const CLASES_GASTO = [
  { valor: '51', etiqueta: '51 - Administración' },
  { valor: '52', etiqueta: '52 - Ventas' },
  { valor: '72', etiqueta: '72 - Producción' },
];

const formatearTamano = (bytes) => {
  if (!bytes) return '';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

export default function PantallaCarga() {
  const [file, setFile] = useState(null);
  const [operador, setOperador] = useState('soi');
  const [consecutivoInicial, setConsecutivoInicial] = useState(1);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [arrastrando, setArrastrando] = useState(false);

  // States for NITs wizard
  const [nitCcf, setNitCcf] = useState('');
  const [nitArl, setNitArl] = useState('');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(null);

  // States for worker classifications
  const [trabajadoresUnclassified, setTrabajadoresUnclassified] = useState([]);
  const [classifications, setClassifications] = useState({});
  const [classLoading, setClassLoading] = useState(false);

  // Integrated Revision states
  const [revisionCargaId, setRevisionCargaId] = useState(null);
  const [revisionData, setRevisionData] = useState(null);
  const [pagosNoSalariales, setPagosNoSalariales] = useState({});
  const [revisionLoading, setRevisionLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [mensajeRevision, setMensajeRevision] = useState(null);

  // Real-time calculation visual feedback state
  const [isUpdating, setIsUpdating] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setArrastrando(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setArrastrando(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setArrastrando(false);
    const soltado = e.dataTransfer.files?.[0];
    if (!soltado) return;
    if (soltado.type !== 'application/pdf') {
      setResultado({ error: 'El archivo debe ser un PDF.' });
      return;
    }
    setResultado(null);
    setFile(soltado);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setResultado(null);
    setMensajeExito(null);
    setRevisionCargaId(null);
    setRevisionData(null);

    const formData = new FormData();
    formData.append("pdf_file", file);
    formData.append("operador", operador);
    formData.append("consecutivo_inicial", consecutivoInicial);

    try {
      const response = await fetch("/api/cargas/cargar", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      setResultado(data);

      if (data.status === 'needs_config' && data.aportante) {
        setNitCcf(data.aportante.nit_ccf || '');
        setNitArl(data.aportante.nit_arl || '');
      }

      if (data.status === 'success' && data.carga_id) {
        setRevisionCargaId(data.carga_id);
      }
    } catch (error) {
      console.error("Error al cargar el archivo:", error);
      setResultado({ error: "Error de conexión con el servidor" });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmarNits = async (e) => {
    e.preventDefault();
    if (!resultado || !resultado.carga_id) return;

    setConfirmLoading(true);
    try {
      const response = await fetch(`/api/cargas/${resultado.carga_id}/confirmar_nits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nit_ccf: nitCcf,
          nit_arl: nitArl,
        }),
      });

      const data = await response.json();
        if (data.status === 'needs_workers_classification') {
          setTrabajadoresUnclassified(data.trabajadores);
          const initialMap = {};
          data.trabajadores.forEach(t => {
            initialMap[t.id] = t.clase_gasto && ["51", "52", "72"].includes(t.clase_gasto) ? t.clase_gasto : "51";
          });
          setClassifications(initialMap);
        } else if (data.status === 'success') {
        setRevisionCargaId(data.carga_id);
      } else {
        setResultado({ error: data.error || "Ocurrió un error al guardar los NITs" });
      }
    } catch (error) {
      console.error("Error al confirmar NITs:", error);
      setResultado({ error: "Error de conexión con el servidor" });
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleClasificarTrabajadores = async (e) => {
    e.preventDefault();
    if (!resultado || !resultado.carga_id) return;

    setClassLoading(true);
    try {
      const response = await fetch(`/api/cargas/${resultado.carga_id}/clasificar_trabajadores`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clasificaciones: classifications,
        }),
      });

      const data = await response.json();
      if (data.status === 'success') {
        setTrabajadoresUnclassified([]);
        setRevisionCargaId(data.carga_id);
      } else {
        setResultado({ error: data.error || "Ocurrió un error al clasificar trabajadores" });
      }
    } catch (error) {
      console.error("Error al clasificar trabajadores:", error);
      setResultado({ error: "Error de conexión con el servidor" });
    } finally {
      setClassLoading(false);
    }
  };

  const fetchRevisionData = async (cargaId) => {
    setRevisionLoading(true);
    setMensajeRevision(null);
    try {
      const res = await fetch(`/api/revision/${cargaId}`);
      const data = await res.json();
      setRevisionData(data);

      // Initialize local state for checkboxes
      const inicial = {};
      if (data.lineas) {
        data.lineas.forEach(l => {
          inicial[l.linea_id] = l.aplica_no_salarial;
        });
      }
      setPagosNoSalariales(inicial);
    } catch (err) {
      console.error("Error al cargar revisión:", err);
      setMensajeRevision({ tipo: 'peligro', texto: "Error al conectar con el servidor para revisión." });
    } finally {
      setRevisionLoading(false);
    }
  };

  const handleTogglePagoNoSalarial = (lineaId, aplica) => {
    setPagosNoSalariales(prev => ({ ...prev, [lineaId]: aplica }));
  };

  const hasUnsavedChanges = React.useMemo(() => {
    if (!revisionData || !revisionData.lineas) return false;
    for (const l of revisionData.lineas) {
      const current = pagosNoSalariales[l.linea_id] || false;
      if (current !== (l.aplica_no_salarial || false)) {
        return true;
      }
    }
    return false;
  }, [revisionData, pagosNoSalariales]);

  const aplicarPagosNoSalariales = async () => {
    setIsUpdating(true); // Disable interface & show feedback
    setMensajeRevision({ tipo: 'info', texto: "Recalculando pagos no salariales..." });
    try {
      const res = await fetch(`/api/revision/${revisionCargaId}/batch_pago_no_salarial`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selecciones: pagosNoSalariales,
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        // Fetch fresh calculations
        const refreshRes = await fetch(`/api/revision/${revisionCargaId}`);
        const freshData = await refreshRes.json();
        setRevisionData(freshData);
        setMensajeRevision({ tipo: 'exito', texto: "Recálculo completado exitosamente." });
      } else {
        setMensajeRevision({ tipo: 'peligro', texto: data.error || "Error al actualizar Pago No Salarial" });
      }
    } catch (err) {
      console.error(err);
      setMensajeRevision({ tipo: 'peligro', texto: "Error al actualizar Pago No Salarial" });
    } finally {
      setIsUpdating(false); // Enable interface
    }
  };

  const handleDescargarExcel = async () => {
    setExcelLoading(true);
    setMensajeRevision(null);
    try {
      const res = await fetch(`/api/revision/${revisionCargaId}/regenerar_excel`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.status === 'success') {
        setMensajeRevision({ tipo: 'exito', texto: "¡Archivo Excel generado! Iniciando descarga..." });

        // Programmatic download to bypass popup blockers
        const downloadUrl = data.ruta_descarga;
        const link = document.createElement('a');
        link.href = downloadUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        setMensajeRevision({ tipo: 'peligro', texto: data.error || "Error al generar Excel" });
      }
    } catch (err) {
      console.error(err);
      setMensajeRevision({ tipo: 'peligro', texto: "Error de conexión." });
    } finally {
      setExcelLoading(false);
    }
  };

  const handleDescargarTerceros = () => {
    // Just trigger the endpoint directly since it generates and returns the file
    const downloadUrl = `/api/cargas/descargar_terceros/${revisionCargaId}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResetCarga = () => {
    setFile(null);
    setResultado(null);
    setMensajeExito(null);
    setRevisionCargaId(null);
    setRevisionData(null);
    setMensajeRevision(null);
    setIsUpdating(false);
  };

  useEffect(() => {
    if (revisionCargaId) {
      fetchRevisionData(revisionCargaId);
    }
  }, [revisionCargaId]);

  // Integrated Revision UI
  if (revisionCargaId) {
    const bloqueado = excelLoading || isUpdating || hasUnsavedChanges;

    return (
      <div className="pagina carga carga--ancha">
        <header className="pagina__cabecera">
          <div>
            <h1 className="pagina__titulo">Revisión de Cálculos Contables</h1>
            <p className="pagina__descripcion">
              Revisa los montos y selecciona a quién le aplica el Pago No Salarial antes de exportar el Excel.
            </p>
          </div>
          <div className="pagina__acciones">
            <button
              type="button"
              className="boton"
              onClick={handleResetCarga}
              disabled={isUpdating}
            >
              Cargar otro PDF
            </button>
          </div>
        </header>

        {mensajeRevision && (
          <Aviso tipo={mensajeRevision.tipo}>{mensajeRevision.texto}</Aviso>
        )}

        {revisionLoading ? (
          <div className="cargando">Cargando datos calculados para revisión...</div>
        ) : revisionData ? (
          <div className="revision-carga">
            {isUpdating && (
              <div className="capa-ocupada">
                <div className="capa-ocupada__caja" role="status">
                  Recalculando fórmulas...
                </div>
              </div>
            )}

            <div className="tabla-envoltura">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Empleado</th>
                    <th>Cédula</th>
                    <th>Gasto</th>
                    <th>Pago No Salarial</th>
                    <th className="tabla__num">Neto a Pagar</th>
                  </tr>
                </thead>
                <tbody>
                  {revisionData.lineas.map((l) => {
                    const salNetoObj = l.valores.salario_por_pagar;
                    const valNeto = salNetoObj ? salNetoObj.valor_actual : 0;
                    return (
                      <tr key={l.linea_id}>
                        <td className="tabla__principal">{l.trabajador.nombre_completo}</td>
                        <td className="num">{l.trabajador.numero_documento}</td>
                        <td>
                          <span className="insignia insignia--sin-punto">
                            {l.trabajador.clase_gasto}
                          </span>
                        </td>
                        <td>
                          <label className="interruptor">
                            <input
                              type="checkbox"
                              checked={pagosNoSalariales[l.linea_id] || false}
                              disabled={isUpdating}
                              onChange={(e) => handleTogglePagoNoSalarial(l.linea_id, e.target.checked)}
                            />
                            {l.aplica_no_salarial ? "Aplicado" : "No aplica"}
                          </label>
                        </td>
                        <td className="tabla__num">${valNeto.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="revision-carga__acciones">
              <div>
                <button
                  type="button"
                  className="boton"
                  onClick={aplicarPagosNoSalariales}
                  disabled={isUpdating || !hasUnsavedChanges}
                >
                  {isUpdating ? "Recalculando fórmulas..." : "Aplicar Pagos No Salariales y Recalcular"}
                </button>
                {hasUnsavedChanges && (
                  <p className="revision-carga__nota">Guarda los cambios para continuar</p>
                )}
              </div>

              <div className="revision-carga__descargas">
                <button
                  type="button"
                  className="boton"
                  onClick={handleDescargarTerceros}
                  disabled={bloqueado}
                >
                  <IconoDescarga size={16} aria-hidden="true" />
                  Descargar Plano Terceros
                </button>
                <BotonAccion
                  type="button"
                  icono={<IconoExcel size={16} aria-hidden="true" />}
                  onClick={handleDescargarExcel}
                  disabled={bloqueado}
                >
                  {excelLoading ? "Generando Excel..." : "Descargar Excel Final"}
                </BotonAccion>
              </div>
            </div>
          </div>
        ) : (
          <Aviso tipo="peligro">No se pudieron cargar los datos de revisión.</Aviso>
        )}
      </div>
    );
  }

  // Upload/Config/Classification UI
  return (
    <div className="pagina carga">
      <header className="pagina__cabecera">
        <div>
          <h1 className="pagina__titulo">Cargar Planilla PILA</h1>
          <p className="pagina__descripcion">
            Sube el archivo PDF para extraer la información y generar el diario contable de nómina.
          </p>
        </div>
      </header>

      <div className="tarjeta">
        <div className="tarjeta__cuerpo">
          <form onSubmit={handleSubmit} className="carga__formulario">
            {/* Archivo PDF */}
            <div className="campo">
              <span className="campo__etiqueta" id="etiqueta-pdf">
                Archivo PDF de la Planilla
              </span>

              {file ? (
                <div className="archivo">
                  <span className="archivo__icono" aria-hidden="true">
                    <IconoPdf size={20} />
                  </span>
                  <div className="archivo__datos">
                    <div className="archivo__nombre">{file.name}</div>
                    <div className="archivo__meta">{formatearTamano(file.size)} · PDF</div>
                  </div>
                  <button
                    type="button"
                    className="boton boton--fantasma boton--peligro boton--sm"
                    onClick={() => setFile(null)}
                    aria-label={`Quitar el archivo ${file.name}`}
                  >
                    <IconoCerrar size={16} aria-hidden="true" />
                    Quitar
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="pdf"
                  className={`dropzone${arrastrando ? ' dropzone--arrastrando' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <span className="dropzone__icono" aria-hidden="true">
                    <IconoSubida size={24} />
                  </span>
                  <span className="dropzone__titulo">
                    Arrastra el PDF aquí o <span className="dropzone__enlace">búscalo en tu equipo</span>
                  </span>
                  <span className="dropzone__nota">Un solo archivo PDF de planilla</span>
                  <input
                    type="file"
                    id="pdf"
                    className="dropzone__input"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    aria-labelledby="etiqueta-pdf"
                  />
                </label>
              )}
            </div>

            {/* Operador */}
            <div className="campo">
              <label className="campo__etiqueta" id="etiqueta-operador" htmlFor="operador">
                Operador PILA
              </label>
              <Selector
                id="operador"
                aria-labelledby="etiqueta-operador"
                opciones={OPERADORES}
                valor={operador}
                onChange={setOperador}
              />
            </div>

            {/* Consecutivo */}
            <div className="campo">
              <label className="campo__etiqueta" htmlFor="consecutivo">
                Consecutivo Inicial
              </label>
              <input
                id="consecutivo"
                type="number"
                className="control control--num"
                value={consecutivoInicial}
                onChange={(e) => setConsecutivoInicial(parseInt(e.target.value) || 1)}
                min="1"
              />
              <span className="campo__ayuda">
                Número de la primera fila del diario contable.
              </span>
            </div>

            {/* Sin archivo el botón se bloquea, pero sigue siendo enfocable
                para que el tooltip pueda explicar qué falta. El envío ya lo
                corta handleSubmit. */}
            {file ? (
              <BotonAccion type="submit" className="boton--bloque" disabled={loading}>
                {loading ? "Procesando y Calculando..." : "Subir y Calcular Nómina"}
              </BotonAccion>
            ) : (
              <Tooltip
                bloque
                texto="Primero sube el archivo PDF de la planilla. Sin él no se puede extraer la información ni calcular la nómina."
              >
                <BotonAccion
                  type="submit"
                  className="boton--bloque boton--bloqueado"
                  aria-disabled="true"
                  icono={<IconoCandado size={16} aria-hidden="true" />}
                >
                  Subir y Calcular Nómina
                </BotonAccion>
              </Tooltip>
            )}
          </form>

          {/* Mago de configuración de NITs si la empresa no los tiene */}
          {resultado && resultado.status === 'needs_config' && trabajadoresUnclassified.length === 0 && !mensajeExito && (
            <div className="panel">
              <h2 className="panel__titulo">Datos que faltan de la empresa</h2>
              <p className="panel__descripcion">
                Solo se piden una vez: quedan guardados para los siguientes meses.
              </p>
              <form onSubmit={handleConfirmarNits} className="panel__formulario">
                <div className="campo">
                  <label className="campo__etiqueta" htmlFor="nit-arl">
                    NIT de la Administradora de Riesgos Laborales (ARL)
                  </label>
                  <input
                    id="nit-arl"
                    type="text"
                    className="control"
                    value={nitArl}
                    onChange={(e) => setNitArl(e.target.value)}
                    placeholder="Ej: 860011153"
                    required
                  />
                </div>
                <div className="campo">
                  <label className="campo__etiqueta" htmlFor="nit-ccf">
                    NIT de la Caja de Compensación (CCF)
                  </label>
                  <input
                    id="nit-ccf"
                    type="text"
                    className="control"
                    value={nitCcf}
                    onChange={(e) => setNitCcf(e.target.value)}
                    placeholder="Ej: 890900841"
                    required
                  />
                </div>

                <BotonAccion type="submit" disabled={confirmLoading}>
                  {confirmLoading ? "Guardando..." : "Confirmar y Continuar"}
                </BotonAccion>
              </form>
            </div>
          )}

          {/* Clasificación interactiva de trabajadores (51/52/72) */}
          {resultado && resultado.status === 'needs_config' && trabajadoresUnclassified.length > 0 && !mensajeExito && (
            <div className="panel">
              <h2 className="panel__titulo">Clasificación de Clase de Gasto de los Trabajadores</h2>
              <p className="panel__descripcion">
                Asigna a cada empleado su correspondiente código contable de gasto
                (51 = Administración, 52 = Ventas, 72 = Producción).
              </p>
              <form onSubmit={handleClasificarTrabajadores} className="panel__formulario">
                <div className="tabla-envoltura panel__lista">
                  <table className="tabla">
                    <thead>
                      <tr>
                        <th>Trabajador</th>
                        <th>Cédula</th>
                        <th>Clase Gasto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trabajadoresUnclassified.map((t) => (
                        <tr key={t.id}>
                          <td className="tabla__principal">{t.nombre_completo}</td>
                          <td className="num">{t.numero_documento}</td>
                          <td>
                            <Selector
                              compacto
                              opciones={CLASES_GASTO}
                              valor={classifications[t.id] || "51"}
                              aria-label={`Clase de gasto de ${t.nombre_completo}`}
                              onChange={(nuevo) => setClassifications({
                                ...classifications,
                                [t.id]: nuevo
                              })}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <BotonAccion type="submit" disabled={classLoading}>
                  {classLoading ? "Guardando..." : "Guardar y Ver Revisión"}
                </BotonAccion>
              </form>
            </div>
          )}

          {/* Errores del Servidor */}
          {resultado && resultado.error && (
            <div className="panel">
              <Aviso tipo="peligro" titulo="No se pudo procesar la planilla">
                {resultado.error}
              </Aviso>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
