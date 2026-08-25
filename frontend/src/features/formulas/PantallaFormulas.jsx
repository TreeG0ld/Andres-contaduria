import React, { useState, useEffect } from 'react';

export default function PantallaFormulas() {
  const [formulas, setFormulas] = useState([]);
  const [selectedFormula, setSelectedFormula] = useState(null);
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
        setMensaje({ tipo: 'success', texto: "¡Listo! Fórmula guardada." });
        setFormulas(formulas.map(f => f.id === selectedFormula.id ? { ...f, expresion, etiqueta } : f));
        setSelectedFormula(null);
      } else {
        setMensaje({ tipo: 'error', texto: data.error || "Error al actualizar." });
      }
    } catch (err) {
      console.error(err);
      setMensaje({ tipo: 'error', texto: "Error de conexión." });
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "'Outfit', sans-serif" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ margin: 0, fontSize: "24px", color: "#1E3A8A", fontWeight: "700" }}>Configurar Fórmulas</h1>
        <p style={{ margin: 0, color: "#6B7280", fontSize: "14px" }}>Aquí puedes ver y cambiar las 19 reglas contables que se aplican a cada trabajador.</p>
      </div>

      {mensaje && (
        <div style={{
          padding: "0.75rem 1rem",
          borderRadius: "6px",
          marginBottom: "1.5rem",
          backgroundColor: mensaje.tipo === 'success' ? '#F0FDF4' : '#FEF2F2',
          border: `1px solid ${mensaje.tipo === 'success' ? '#86EFAC' : '#FCA5A5'}`,
          color: mensaje.tipo === 'success' ? '#166534' : '#991B1B',
          fontSize: "13px",
          fontWeight: "500"
        }}>
          {mensaje.texto}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#6B7280" }}>Cargando fórmulas...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: selectedFormula ? "1.2fr 1fr" : "1fr", gap: "2rem", alignItems: "start" }}>
          
          {/* Listado de Fórmulas */}
          <div style={{ background: "white", borderRadius: "12px", border: "1px solid #E5E7EB", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <h2 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "1rem", color: "#1F2937" }}>Orden de las fórmulas</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#F9FAFB", borderBottom: "1px solid #E5E7EB", textAlign: "left" }}>
                    <th style={{ padding: "0.75rem", width: "60px" }}>Orden</th>
                    <th style={{ padding: "0.75rem" }}>Código</th>
                    <th style={{ padding: "0.75rem" }}>Nombre</th>
                    <th style={{ padding: "0.75rem" }}>Fórmula</th>
                    <th style={{ padding: "0.75rem", textRight: "right" }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {formulas.map(f => {
                    const isSelected = selectedFormula && selectedFormula.id === f.id;
                    return (
                      <tr key={f.id} style={{ borderBottom: "1px solid #F3F4F6", backgroundColor: isSelected ? "#F3F4F6" : "transparent" }}>
                        <td style={{ padding: "0.75rem", fontWeight: "600", color: "#6B7280" }}>{f.orden}</td>
                        <td style={{ padding: "0.75rem", fontWeight: "600", color: "#1E40AF" }}>{f.codigo}</td>
                        <td style={{ padding: "0.75rem", color: "#374151" }}>{f.etiqueta}</td>
                        <td style={{ padding: "0.75rem", fontFamily: "monospace", color: "#059669" }}>{f.expresion}</td>
                        <td style={{ padding: "0.75rem" }}>
                          <button
                            onClick={() => selectFormulaForEdit(f)}
                            style={{
                              padding: "0.3rem 0.6rem",
                              backgroundColor: "transparent",
                              border: "1px solid #D1D5DB",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "12px"
                            }}
                          >
                            Cambiar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Formulario de Edición */}
          {selectedFormula && (
            <div style={{ background: "white", borderRadius: "12px", border: "1px solid #E5E7EB", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "700", margin: "0 0 1rem 0", color: "#1F2937" }}>
                Modificar fórmula: {selectedFormula.codigo}
              </h3>

              <form onSubmit={handleUpdateFormula} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <label style={{ fontSize: "13px", fontWeight: "600", color: "#374151" }}>Nombre descriptivo:</label>
                  <input
                    type="text"
                    value={etiqueta}
                    onChange={(e) => setEtiqueta(e.target.value)}
                    style={{ padding: "0.5rem", border: "1px solid #D1D5DB", borderRadius: "6px", fontSize: "13px" }}
                    required
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <label style={{ fontSize: "13px", fontWeight: "600", color: "#374151" }}>Expresión matemática:</label>
                  <textarea
                    rows="3"
                    value={expresion}
                    onChange={(e) => setExpresion(e.target.value)}
                    style={{ padding: "0.5rem", border: "1px solid #D1D5DB", borderRadius: "6px", fontSize: "13px", fontFamily: "monospace" }}
                    required
                  />
                  <small style={{ color: "#6B7280", fontSize: "11px" }}>
                    Puedes usar variables de la planilla (ej: <code>IBC_PENSION</code>), del mes (ej: <code>SALARIO_MINIMO</code>) u otras fórmulas anteriores.
                  </small>
                </div>

                <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                  <button
                    type="submit"
                    disabled={saveLoading}
                    style={{
                      flex: 1,
                      padding: "0.7rem",
                      backgroundColor: "#1D4ED8",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      fontWeight: "600",
                      cursor: saveLoading ? "not-allowed" : "pointer",
                      fontSize: "13px"
                    }}
                  >
                    {saveLoading ? "Actualizando..." : "Guardar cambios"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFormula(null)}
                    style={{
                      padding: "0.7rem 1rem",
                      backgroundColor: "transparent",
                      border: "1px solid #D1D5DB",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "13px",
                      color: "#4B5563"
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
