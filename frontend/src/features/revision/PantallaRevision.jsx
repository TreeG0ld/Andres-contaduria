import React, { useState, useEffect } from 'react';
import Aviso from '../../components/Aviso';
import Selector from '../../components/ui/Selector';
import BotonAccion from '../../components/ui/BotonAccion';
import { IconoEditar, IconoExcel } from '../../components/iconos';
import './PantallaRevision.css';

export default function PantallaRevision() {
  const [cargas, setCargas] = useState([]);
  const [selectedCargaId, setSelectedCargaId] = useState('');

  // States for filters
  const [filtroEmpresa, setFiltroEmpresa] = useState("TODAS");
  const [filtroPeriodo, setFiltroPeriodo] = useState("TODOS");

  const [revisionData, setRevisionData] = useState(null);
  const [selectedLinea, setSelectedLinea] = useState(null);
  const [editedValores, setEditedValores] = useState({}); // maps valor_calculado_id to string value
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  // Fetch loads history to populate dropdown
  useEffect(() => {
    fetch('/api/cargas/historial')
      .then(res => res.json())
      .then(data => {
        setCargas(data);
        if (data.length > 0) {
          setSelectedCargaId(data[0].id);
        }
      })
      .catch(err => console.error("Error al cargar historial:", err));
  }, []);

  // Compute unique filters
  const empresasUnicas = React.useMemo(() => {
    const empresas = new Set(cargas.map(c => c.aportante?.razon_social || "Sin Empresa"));
    return Array.from(empresas).sort();
  }, [cargas]);

  const periodosUnicos = React.useMemo(() => {
    const periodos = new Set(cargas.map(c => c.periodo || "Sin Periodo"));
    return Array.from(periodos).sort().reverse();
  }, [cargas]);

  // Compute filtered cargas
  const cargasFiltradas = React.useMemo(() => {
    return cargas.filter(c => {
      const cumpleEmpresa = filtroEmpresa === "TODAS" || (c.aportante?.razon_social || "Sin Empresa") === filtroEmpresa;
      const cumplePeriodo = filtroPeriodo === "TODOS" || (c.periodo || "Sin Periodo") === filtroPeriodo;
      return cumpleEmpresa && cumplePeriodo;
    });
  }, [cargas, filtroEmpresa, filtroPeriodo]);

  // Auto-select first matching carga when filters change
  useEffect(() => {
    if (cargasFiltradas.length > 0) {
      if (!cargasFiltradas.find(c => c.id === selectedCargaId)) {
        setSelectedCargaId(cargasFiltradas[0].id);
      }
    } else {
      setSelectedCargaId('');
    }
  }, [cargasFiltradas, selectedCargaId]);

  // Fetch revision data when selected load changes
  useEffect(() => {
    if (!selectedCargaId) {
      setRevisionData(null);
      return;
    }
    setLoading(true);
    setSelectedLinea(null);
    setEditedValores({});
    setMensaje(null);
    fetch(`/api/revision/${selectedCargaId}`)
      .then(res => res.json())
      .then(data => {
        setRevisionData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error al cargar revisión:", err);
        setLoading(false);
      });
  }, [selectedCargaId]);

  const selectLineaForEdit = (linea) => {
    setSelectedLinea(linea);
    const initialEdits = {};
    Object.keys(linea.valores).forEach(key => {
      const valObj = linea.valores[key];
      initialEdits[valObj.id] = valObj.valor_editado !== null ? valObj.valor_editado.toString() : '';
    });
    setEditedValores(initialEdits);
  };

  const handleSaveEdiciones = async (e) => {
    e.preventDefault();
    if (!selectedLinea) return;
    setSaveLoading(true);
    setMensaje(null);

    const ediciones = Object.keys(editedValores).map(id => {
      const val = editedValores[id];
      return {
        valor_calculado_id: parseInt(id),
        valor_editado: val.trim() === '' ? null : parseFloat(val)
      };
    });

    try {
      const res = await fetch('/api/revision/guardar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ediciones })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setMensaje({ tipo: 'exito', texto: "Cambios guardados con éxito." });
        // Refresh data
        const refreshResponse = await fetch(`/api/revision/${selectedCargaId}`);
        const freshData = await refreshResponse.json();
        setRevisionData(freshData);
        // Find updated line
        const updated = freshData.lineas.find(l => l.linea_id === selectedLinea.linea_id);
        if (updated) {
          selectLineaForEdit(updated);
        }
      } else {
        setMensaje({ tipo: 'peligro', texto: data.error || "Error al guardar." });
      }
    } catch (err) {
      console.error("Error al guardar:", err);
      setMensaje({ tipo: 'peligro', texto: "Error de conexión." });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleRegenerarExcel = async () => {
    if (!selectedCargaId) return;
    setExcelLoading(true);
    setMensaje(null);
    try {
      const res = await fetch(`/api/revision/${selectedCargaId}/regenerar_excel`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.status === 'success') {
        setMensaje({ tipo: 'exito', texto: "¡Excel regenerado y descargado!" });
        // Programmatic download to bypass popup blockers
        const downloadUrl = data.ruta_descarga;
        const link = document.createElement('a');
        link.href = downloadUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        setMensaje({ tipo: 'peligro', texto: data.error || "Error al regenerar." });
      }
    } catch (err) {
      console.error(err);
      setMensaje({ tipo: 'peligro', texto: "Error de conexión." });
    } finally {
      setExcelLoading(false);
    }
  };

  return (
    <div className="pagina">
      <header className="pagina__cabecera">
        <div>
          <h1 className="pagina__titulo">Revisar Cálculos</h1>
          <p className="pagina__descripcion">
            Revisa y cambia los montos de la nómina si ves algo mal antes de armar el Excel.
          </p>
        </div>
      </header>

      <div className="filtros">
        <div className="campo">
          <label className="campo__etiqueta" id="lbl-rev-empresa" htmlFor="rev-empresa">
            Filtrar por empresa
          </label>
          <Selector
            id="rev-empresa"
            aria-labelledby="lbl-rev-empresa"
            valor={filtroEmpresa}
            onChange={setFiltroEmpresa}
            opciones={[
              { valor: 'TODAS', etiqueta: 'Todas las empresas' },
              ...empresasUnicas.map(emp => ({ valor: emp, etiqueta: emp })),
            ]}
          />
        </div>

        <div className="campo">
          <label className="campo__etiqueta" id="lbl-rev-periodo" htmlFor="rev-periodo">
            Filtrar por periodo
          </label>
          <Selector
            id="rev-periodo"
            aria-labelledby="lbl-rev-periodo"
            valor={filtroPeriodo}
            onChange={setFiltroPeriodo}
            opciones={[
              { valor: 'TODOS', etiqueta: 'Todos los meses' },
              ...periodosUnicos.map(per => ({ valor: per, etiqueta: per })),
            ]}
          />
        </div>

        <div className="campo">
          <label className="campo__etiqueta" id="lbl-rev-archivo" htmlFor="rev-archivo">
            Archivo a revisar
          </label>
          <Selector
            id="rev-archivo"
            aria-labelledby="lbl-rev-archivo"
            valor={selectedCargaId}
            onChange={setSelectedCargaId}
            disabled={cargasFiltradas.length === 0}
            placeholder="No hay archivos"
            opciones={cargasFiltradas.map(c => ({
              valor: c.id,
              etiqueta: `${c.periodo.replace("-", " ")} - ${c.aportante?.razon_social || "Desconocido"} (${c.operador.toUpperCase()})`,
            }))}
          />
        </div>
      </div>

      {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}

      {loading ? (
        <div className="cargando">Cargando datos de revisión...</div>
      ) : revisionData ? (
        <div className={`revision${selectedLinea ? '' : ' revision--sin-editor'}`}>
          {/* Tabla de Trabajadores */}
          <section className="tarjeta">
            <div className="tarjeta__cabecera">
              <h2>Trabajadores ({revisionData.lineas.length})</h2>
              <button
                type="button"
                className="boton boton--primario boton--sm"
                onClick={handleRegenerarExcel}
                disabled={excelLoading}
              >
                <IconoExcel size={14} aria-hidden="true" />
                {excelLoading ? "Generando..." : "Volver a generar y descargar Excel"}
              </button>
            </div>

            <div className="tabla-envoltura tabla-envoltura--plana">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Empleado</th>
                    <th>Cédula</th>
                    <th>Gasto</th>
                    <th className="tabla__num">Neto a pagar</th>
                    <th className="tabla__acciones">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {revisionData.lineas.map(l => {
                    const salNetoObj = l.valores.salario_por_pagar;
                    const valNeto = salNetoObj ? salNetoObj.valor_actual : 0;
                    const isSelected = selectedLinea && selectedLinea.linea_id === l.linea_id;
                    return (
                      <tr key={l.linea_id} className={isSelected ? 'revision__fila--activa' : undefined}>
                        <td className="tabla__principal">{l.trabajador.nombre_completo}</td>
                        <td className="num">{l.trabajador.numero_documento}</td>
                        <td>
                          <span className="insignia insignia--sin-punto">
                            {l.trabajador.clase_gasto}
                          </span>
                        </td>
                        <td className="tabla__num">${valNeto.toLocaleString()}</td>
                        <td className="tabla__acciones">
                          <button
                            type="button"
                            className="boton boton--sm"
                            onClick={() => selectLineaForEdit(l)}
                            aria-label={`Editar montos de ${l.trabajador.nombre_completo}`}
                          >
                            <IconoEditar size={14} aria-hidden="true" />
                            Editar montos
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Formulario de Detalle y Edición */}
          {selectedLinea && (
            <section className="tarjeta revision__editor">
              <div className="tarjeta__cabecera">
                <h2>Modificar montos</h2>
              </div>
              <div className="tarjeta__cuerpo">
                <p className="pagina__descripcion">
                  <strong>{selectedLinea.trabajador.nombre_completo}</strong>
                </p>
                <p className="campo__ayuda">
                  Escribe el nuevo valor sin decimales para corregirlo. Si lo dejas vacío,
                  se usará el cálculo automático original.
                </p>

                <form onSubmit={handleSaveEdiciones}>
                  <div className="montos">
                    {Object.keys(selectedLinea.valores).map(key => {
                      const valObj = selectedLinea.valores[key];
                      const idCampo = `monto-${valObj.id}`;
                      return (
                        <div key={key} className="monto">
                          <div className="monto__datos">
                            <label className="monto__concepto" htmlFor={idCampo}>
                              {key.replace(/_/g, ' ')}
                            </label>
                            <span className="monto__original">
                              Cálculo automático: ${valObj.valor_original.toLocaleString()}
                            </span>
                          </div>
                          <input
                            id={idCampo}
                            type="number"
                            className="control control--sm control--num monto__entrada"
                            placeholder={valObj.valor_original.toString()}
                            value={editedValores[valObj.id] || ''}
                            onChange={(e) => setEditedValores({
                              ...editedValores,
                              [valObj.id]: e.target.value
                            })}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="revision__botones">
                    <BotonAccion type="submit" disabled={saveLoading}>
                      {saveLoading ? "Guardando..." : "Guardar cambios"}
                    </BotonAccion>
                    <button
                      type="button"
                      className="boton"
                      onClick={() => setSelectedLinea(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="vacio">
          <span className="vacio__titulo">Aún no hay planillas</span>
          Sube una planilla PILA desde "Nueva carga" para poder revisar sus cálculos.
        </div>
      )}
    </div>
  );
}
