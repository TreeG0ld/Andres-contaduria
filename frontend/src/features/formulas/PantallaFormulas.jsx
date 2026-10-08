import React, { useState, useEffect } from 'react';
import Aviso from '../../components/Aviso';
import Modal from '../../components/ui/Modal';
import Toast from '../../components/ui/Toast';
import BotonAccion from '../../components/ui/BotonAccion';
import { IconoEditar } from '../../components/iconos';
import './PantallaFormulas.css';

export default function PantallaFormulas() {
  const [versiones, setVersiones] = useState([]);
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [formulas, setFormulas] = useState([]);

  const [selectedFormula, setSelectedFormula] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [expresion, setExpresion] = useState('');
  const [etiqueta, setEtiqueta] = useState('');

  const [modalNuevaVersionAbierto, setModalNuevaVersionAbierto] = useState(false);
  const [nuevaVersionNombre, setNuevaVersionNombre] = useState('');
  const [creandoVersion, setCreandoVersion] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const [errorModal, setErrorModal] = useState(null);
  const [errorCarga, setErrorCarga] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchVersiones();
  }, []);

  useEffect(() => {
    if (selectedVersionId) {
      fetchFormulas(selectedVersionId);
    }
  }, [selectedVersionId]);

  const fetchVersiones = async () => {
    try {
      const res = await fetch('/api/formulas/versiones');
      const data = await res.json();
      setVersiones(data);
      if (data.length > 0) {
        setSelectedVersionId(prev => {
          if (!prev) {
            const activa = data.find(v => v.activa) || data[0];
            return activa.id;
          }
          return prev;
        });
      }
    } catch (err) {
      console.error("Error al cargar versiones:", err);
      setErrorCarga("No se pudieron cargar las versiones de fórmulas.");
    }
  };

  const fetchFormulas = (versionId) => {
    setLoading(true);
    fetch(`/api/formulas?version_id=${versionId}`)
      .then(res => res.json())
      .then(data => {
        setFormulas(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error al cargar fórmulas:", err);
        setErrorCarga("No se pudieron cargar las fórmulas. Revisa la conexión con el servidor.");
        setLoading(false);
      });
  };

  const selectFormulaForEdit = (f) => {
    setSelectedFormula(f);
    setExpresion(f.expresion);
    setEtiqueta(f.etiqueta);
    setErrorModal(null);
    setModalAbierto(true);
  };

  const handleUpdateFormula = async (e) => {
    e.preventDefault();
    if (!selectedFormula) return;
    setSaveLoading(true);
    setErrorModal(null);

    try {
      const response = await fetch(`/api/formulas/${selectedFormula.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expresion, etiqueta })
      });
      const data = await response.json();
      if (data.status === 'success') {
        setFormulas(formulas.map(f => f.id === selectedFormula.id ? { ...f, expresion, etiqueta } : f));
        setModalAbierto(false);
        setToast(`Fórmula ${selectedFormula.columna} guardada`);
      } else {
        setErrorModal(data.error || "Error al actualizar.");
      }
    } catch (err) {
      console.error(err);
      setErrorModal("Error de conexión.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCrearVersion = async (e) => {
    e.preventDefault();
    if (!nuevaVersionNombre.trim()) return;

    setCreandoVersion(true);
    try {
      const res = await fetch('/api/formulas/versiones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nuevaVersionNombre, base_version_id: selectedVersionId || null })
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setToast(`Versión "${nuevaVersionNombre}" creada`);
        setModalNuevaVersionAbierto(false);
        setNuevaVersionNombre('');

        const versRes = await fetch('/api/formulas/versiones');
        const versData = await versRes.json();
        setVersiones(versData);
        setSelectedVersionId(data.version_id);
      } else {
        setErrorCarga(data.detail || "Error al crear versión");
      }
    } catch (err) {
      console.error(err);
      setErrorCarga("Error de conexión al crear versión.");
    } finally {
      setCreandoVersion(false);
    }
  };

  const handleActivarVersion = async () => {
    if (!selectedVersionId) return;
    if (window.confirm("¿Seguro que quieres activar esta versión? Todas las nóminas futuras usarán estas fórmulas.")) {
      try {
        const res = await fetch(`/api/formulas/versiones/${selectedVersionId}/activar`, { method: 'POST' });
        if (res.ok) {
          setToast("Versión activada correctamente.");
          await fetchVersiones();
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const selectedVersion = versiones.find(v => String(v.id) === String(selectedVersionId));
  const hayCambiosModal = selectedFormula && (expresion !== selectedFormula.expresion || etiqueta !== selectedFormula.etiqueta);

  return (
    <div className="pagina">
      <header className="pagina__cabecera" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="pagina__titulo">Configurar Fórmulas</h1>
          <p className="pagina__descripcion">
            Aquí puedes ver y cambiar las 19 reglas contables que se aplican a cada trabajador.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select
            className="control"
            value={selectedVersionId}
            onChange={(e) => setSelectedVersionId(e.target.value)}
            style={{ width: '250px' }}
          >
            {versiones.map(v => (
              <option key={v.id} value={v.id}>
                {v.nombre} {v.activa ? '(Activa)' : ''}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="boton"
            onClick={() => setModalNuevaVersionAbierto(true)}
          >
            Crear versión
          </button>
        </div>
      </header>

      <Aviso tipo="exito">
        <h3 className="aviso__titulo">Las fórmulas funcionan igual que en Excel</h3>
        Puedes usar operaciones matemáticas básicas (+, -, *, /), porcentajes (ej. 40%), condiciones lógicas como <strong>SI([variable]; verdadero; falso)</strong>, y funciones como <strong>REDONDEAR</strong> o <strong>REDONDEAR.MENOS</strong>
      </Aviso>

      {errorCarga && <Aviso tipo="peligro">{errorCarga}</Aviso>}

      {loading ? (
        <div className="cargando">Cargando fórmulas...</div>
      ) : (
        <section className="tarjeta">
          <div className="tarjeta__cabecera">
            <div>
              <h2 style={{ display: 'inline-block', marginRight: '10px' }}>
                Fórmulas en: {selectedVersion?.nombre}
              </h2>
              {selectedVersion?.activa ? (
                <span className="insignia insignia--exito">Activa en producción</span>
              ) : (
                <span className="insignia insignia--advertencia">Borrador / Inactiva</span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              {!selectedVersion?.activa && selectedVersion && (
                <button type="button" className="boton boton--primario boton--sm" onClick={handleActivarVersion}>
                  Activar para el cálculo actual
                </button>
              )}
              <span className="tarjeta__conteo">{formulas.length} reglas</span>
            </div>
          </div>
          <div className="tabla-envoltura tabla-envoltura--plana">
            <table className="tabla">
              <thead>
                <tr>
                  <th className="formulas__orden">Orden</th>
                  <th className="formulas__celda">Celda</th>
                  <th>Concepto</th>
                  <th>Fórmula contable</th>
                  <th className="tabla__acciones">Acción</th>
                </tr>
              </thead>
              <tbody>
                {formulas.map(f => {
                  const isSelected = modalAbierto && selectedFormula?.id === f.id;
                  return (
                    <tr key={f.id} className={isSelected ? 'formulas__fila--activa' : undefined}>
                      <td className="formulas__orden">{f.orden}</td>
                      <td className="formulas__celda">{f.columna}</td>
                      <td className="formulas__concepto">{f.etiqueta}</td>
                      <td className="formulas__expresion">{f.expresion}</td>
                      <td className="tabla__acciones">
                        <button
                          type="button"
                          className="boton boton--sm"
                          onClick={() => selectFormulaForEdit(f)}
                          aria-label={`Cambiar la fórmula ${f.etiqueta}`}
                        >
                          <IconoEditar size={14} aria-hidden="true" />
                          Cambiar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Modal Edit Formula */}
      <Modal
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        onCerrado={() => setSelectedFormula(null)}
        titulo={selectedFormula ? `Modificar celda ${selectedFormula.columna}` : ''}
        descripcion="El cambio se aplica a todos los trabajadores en los siguientes cálculos usando esta versión de la regla."
      >
        <form onSubmit={handleUpdateFormula}>
          <div className="modal__cuerpo panel__formulario">
            {errorModal && <Aviso tipo="peligro">{errorModal}</Aviso>}

            <div className="campo">
              <label className="campo__etiqueta" htmlFor="etiqueta-formula">
                Nombre descriptivo
              </label>
              <input
                id="etiqueta-formula"
                type="text"
                className="control"
                value={etiqueta}
                onChange={(e) => setEtiqueta(e.target.value)}
                required
              />
            </div>

            <div className="campo">
              <label className="campo__etiqueta" htmlFor="expresion-formula">
                Expresión matemática
              </label>
              <textarea
                id="expresion-formula"
                rows="3"
                className="control"
                value={expresion}
                onChange={(e) => setExpresion(e.target.value)}
                aria-describedby="ayuda-formula"
                required
              />
              <div className="ayuda-formula" id="ayuda-formula">
                <div className="ayuda-formula__fila">
                  <span className="ayuda-formula__clave">Celdas de salida</span>
                  <span className="ayuda-formula__fichas">
                    <code>V2</code>
                    <code>W5</code>
                  </span>
                </div>
                <div className="ayuda-formula__fila">
                  <span className="ayuda-formula__clave">Variables de entrada</span>
                  <span className="ayuda-formula__fichas">
                    <code>[IBC Pensión]</code>
                    <code>[Días Caja]</code>
                  </span>
                </div>
                <div className="ayuda-formula__fila">
                  <span className="ayuda-formula__clave">Ejemplos</span>
                  <span className="ayuda-formula__fichas">
                    <code>REDONDEAR.MENOS(V2 * 40%; -3)</code>
                    <code>V2 + V3 + V4 - W5 - W6</code>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="modal__pie">
            <button
              type="button"
              className="boton"
              onClick={() => setModalAbierto(false)}
            >
              Cancelar
            </button>
            <BotonAccion
              type="submit"
              disabled={saveLoading || !hayCambiosModal}
              style={hayCambiosModal ? { backgroundColor: 'var(--exito)', borderColor: 'var(--exito)' } : {}}
            >
              {saveLoading ? "Actualizando..." : (hayCambiosModal ? "Guardar cambios ✨" : "Sin cambios")}
            </BotonAccion>
          </div>
        </form>
      </Modal>

      {/* Modal Create Version */}
      <Modal
        abierto={modalNuevaVersionAbierto}
        onCerrar={() => setModalNuevaVersionAbierto(false)}
        onCerrado={() => setNuevaVersionNombre('')}
        titulo="Crear nueva versión de fórmulas"
        descripcion={`Se copiarán todas las fórmulas de la versión "${selectedVersion?.nombre || 'actual'}" como base para que empieces a modificar.`}
      >
        <form onSubmit={handleCrearVersion}>
          <div className="modal__cuerpo panel__formulario">
            <div className="campo">
              <label className="campo__etiqueta" htmlFor="nombre-version">
                Nombre de la versión (ej. Año 2027)
              </label>
              <input
                id="nombre-version"
                type="text"
                className="control"
                value={nuevaVersionNombre}
                onChange={(e) => setNuevaVersionNombre(e.target.value)}
                autoFocus
                required
              />
            </div>
          </div>
          <div className="modal__pie">
            <button
              type="button"
              className="boton"
              onClick={() => setModalNuevaVersionAbierto(false)}
            >
              Cancelar
            </button>
            <BotonAccion type="submit" disabled={creandoVersion}>
              {creandoVersion ? "Creando..." : "Crear versión"}
            </BotonAccion>
          </div>
        </form>
      </Modal>

      <Toast
        abierto={Boolean(toast)}
        mensaje={toast}
        onCerrar={() => setToast(null)}
      />
    </div>
  );
}
