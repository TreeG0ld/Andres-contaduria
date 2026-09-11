import React, { useState, useEffect } from 'react';
import Aviso from '../../components/Aviso';
import Modal from '../../components/ui/Modal';
import BotonAccion from '../../components/ui/BotonAccion';
import { IconoEditar } from '../../components/iconos';
import './PantallaFormulas.css';

export default function PantallaFormulas() {
  const [formulas, setFormulas] = useState([]);
  const [selectedFormula, setSelectedFormula] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [expresion, setExpresion] = useState('');
  const [etiqueta, setEtiqueta] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  useEffect(() => {
    fetchFormulas();
  }, []);

  const fetchFormulas = () => {
    setLoading(true);
    fetch('/api/formulas')
      .then(res => res.json())
      .then(data => {
        setFormulas(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error al cargar fórmulas:", err);
        setLoading(false);
      });
  };

  const selectFormulaForEdit = (f) => {
    setSelectedFormula(f);
    setExpresion(f.expresion);
    setEtiqueta(f.etiqueta);
    setMensaje(null);
    setModalAbierto(true);
  };

  const handleUpdateFormula = async (e) => {
    e.preventDefault();
    if (!selectedFormula) return;
    setSaveLoading(true);
    setMensaje(null);

    try {
      const response = await fetch(`/api/formulas/${selectedFormula.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expresion, etiqueta })
      });
      const data = await response.json();
      if (data.status === 'success') {
        setMensaje({ tipo: 'exito', texto: "¡Listo! Fórmula guardada." });
        setFormulas(formulas.map(f => f.id === selectedFormula.id ? { ...f, expresion, etiqueta } : f));
        setModalAbierto(false);
      } else {
        setMensaje({ tipo: 'peligro', texto: data.error || "Error al actualizar." });
      }
    } catch (err) {
      console.error(err);
      setMensaje({ tipo: 'peligro', texto: "Error de conexión." });
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="pagina">
      <header className="pagina__cabecera">
        <div>
          <h1 className="pagina__titulo">Configurar Fórmulas</h1>
          <p className="pagina__descripcion">
            Aquí puedes ver y cambiar las 19 reglas contables que se aplican a cada trabajador.
          </p>
        </div>
      </header>

      {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}

      {loading ? (
        <div className="cargando">Cargando fórmulas...</div>
      ) : (
        <section className="tarjeta">
          <div className="tarjeta__cabecera">
            <h2>Orden de las fórmulas</h2>
            <span className="campo__ayuda">{formulas.length} reglas</span>
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

      <Modal
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        onCerrado={() => setSelectedFormula(null)}
        titulo={selectedFormula ? `Modificar celda ${selectedFormula.columna}` : ''}
        descripcion="El cambio se aplica a todos los trabajadores en los siguientes cálculos."
      >
        <form onSubmit={handleUpdateFormula}>
          <div className="modal__cuerpo panel__formulario">
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
              <small className="campo__ayuda formulas__ayuda" id="ayuda-formula">
                Usa celdas de salida (ej: <code>V2</code>, <code>W5</code>) y variables de
                entrada entre corchetes (ej: <code>[IBC Pensión]</code>).
                <br />
                Ejemplo: <code>REDONDEAR.MENOS(V2 * 40%; -3)</code> o{' '}
                <code>V2 + V3 + V4 - W5 - W6</code>.
              </small>
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
            <BotonAccion type="submit" disabled={saveLoading}>
              {saveLoading ? "Actualizando..." : "Guardar cambios"}
            </BotonAccion>
          </div>
        </form>
      </Modal>
    </div>
  );
}
