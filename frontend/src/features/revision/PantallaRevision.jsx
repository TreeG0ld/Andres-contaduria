import React, { useState, useEffect } from 'react';

export default function PantallaRevision() {
  const [cargas, setCargas] = useState([]);
  const [selectedCargaId, setSelectedCargaId] = useState('');
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

  // Fetch revision data when selected load changes
  useEffect(() => {
    if (!selectedCargaId) return;
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
        setMensaje({ tipo: 'success', texto: "Cambios guardados con éxito." });
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
        setMensaje({ tipo: 'error', texto: data.error || "Error al guardar." });
      }
    } catch (err) {
      console.error("Error al guardar:", err);
      setMensaje({ tipo: 'error', texto: "Error de conexión." });
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
        setMensaje({ tipo: 'success', texto: "¡Excel regenerado y descargado!" });
        window.open(data.ruta_descarga, '_blank');
      } else {
        setMensaje({ tipo: 'error', texto: data.error || "Error al regenerar." });
      }
    } catch (err) {
      console.error(err);
      setMensaje({ tipo: 'error', texto: "Error de conexión." });
    } finally {
      setExcelLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "'Outfit', sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "24px", color: "#1E3A8A", fontWeight: "700" }}>Revisar Cálculos</h1>
          <p style={{ margin: 0, color: "#6B7280", fontSize: "14px" }}>Revisa y cambia los montos de la nómina si ves algo mal antes de armar el Excel.</p>
        </div>

        {/* Dropdown de Selección de Carga */}
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <label style={{ fontSize: "14px", fontWeight: "600", color: "#374151" }}>Periodo:</label>
          <select
            value={selectedCargaId}
            onChange={(e) => setSelectedCargaId(e.target.value)}
            style={{ padding: "0.5rem 1rem", borderRadius: "8px", border: "1px solid #D1D5DB", backgroundColor: "white", fontSize: "14px" }}
          >
            {cargas.map(c => (
              <option key={c.id} value={c.id}>
                {c.periodo} - {c.aportante.razon_social} ({c.operador.toUpperCase()})
              </option>
            ))}
          </select>
        </div>
      </div>

      {mensaje && (
        <div style={{
          padding: "1rem",
          borderRadius: "8px",
          marginBottom: "1.5rem",
          backgroundColor: mensaje.tipo === 'success' ? '#ECFDF5' : '#FEF2F2',
          border: `1px solid ${mensaje.tipo === 'success' ? '#10B981' : '#EF4444'}`,
          color: mensaje.tipo === 'success' ? '#065F46' : '#991B1B',
          fontSize: "14px",
          fontWeight: "500"
        }}>
          {mensaje.texto}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#6B7280" }}>Cargando datos de revisión...</div>
      ) : revisionData ? (
        <div style={{ display: "grid", gridTemplateColumns: selectedLinea ? "1.2fr 1fr" : "1fr", gap: "2rem", alignItems: "start" }}>
          
          {/* Tabla de Trabajadores */}
          <div style={{ background: "white", borderRadius: "12px", border: "1px solid #E5E7EB", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ fontSize: "16px", fontWeight: "700", margin: 0, color: "#1F2937" }}>
                Trabajadores ({revisionData.lineas.length})
              </h2>
              <button
                onClick={handleRegenerarExcel}
                disabled={excelLoading}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#2563EB",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: excelLoading ? "not-allowed" : "pointer"
                }}
              >
                {excelLoading ? "Generando..." : "Volver a generar y descargar Excel"}
              </button>
            </div>
            
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#F9FAFB", borderBottom: "1px solid #E5E7EB", textAlign: "left" }}>
                    <th style={{ padding: "0.75rem" }}>Empleado</th>
                    <th style={{ padding: "0.75rem" }}>Cédula</th>
                    <th style={{ padding: "0.75rem" }}>Gasto</th>
                    <th style={{ padding: "0.75rem" }}>Neto a pagar</th>
                    <th style={{ padding: "0.75rem", textRight: "right" }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {revisionData.lineas.map(l => {
                    const salNetoObj = l.valores.salario_por_pagar;
                    const valNeto = salNetoObj ? salNetoObj.valor_actual : 0;
                    const isSelected = selectedLinea && selectedLinea.linea_id === l.linea_id;
                    return (
                      <tr
                        key={l.linea_id}
                        style={{
                          borderBottom: "1px solid #F3F4F6",
                          backgroundColor: isSelected ? "#F3F4F6" : "transparent"
                        }}
                      >
                        <td style={{ padding: "0.75rem", fontWeight: "500" }}>{l.trabajador.nombre_completo}</td>
                        <td style={{ padding: "0.75rem", color: "#4B5563" }}>{l.trabajador.numero_documento}</td>
                        <td style={{ padding: "0.75rem" }}>
                          <span style={{
                            padding: "0.2rem 0.5rem",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: "600",
                            backgroundColor: l.trabajador.clase_gasto === "72" ? "#FEF3C7" : l.trabajador.clase_gasto === "52" ? "#E0F2FE" : "#F3F4F6",
                            color: l.trabajador.clase_gasto === "72" ? "#92400E" : l.trabajador.clase_gasto === "52" ? "#0369A1" : "#374151"
                          }}>
                            {l.trabajador.clase_gasto}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem", fontWeight: "600", color: "#059669" }}>
                          ${valNeto.toLocaleString()}
                        </td>
                        <td style={{ padding: "0.75rem" }}>
                          <button
                            onClick={() => selectLineaForEdit(l)}
                            style={{
                              padding: "0.3rem 0.6rem",
                              backgroundColor: "transparent",
                              border: "1px solid #D1D5DB",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "12px"
                            }}
                          >
                            Editar montos
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Formulario de Detalle y Edición */}
          {selectedLinea && (
            <div style={{ background: "white", borderRadius: "12px", border: "1px solid #E5E7EB", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "700", margin: "0 0 0.5rem 0", color: "#1F2937" }}>
                Modificar montos: {selectedLinea.trabajador.nombre_completo}
              </h3>
              <p style={{ margin: "0 0 1.5rem 0", color: "#6B7280", fontSize: "13px" }}>
                Escribe el nuevo valor sin decimales para corregirlo. Si lo dejas vacío, se usará el cálculo automático original.
              </p>

              <form onSubmit={handleSaveEdiciones}>
                <div style={{ maxHeight: "400px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.75rem", paddingRight: "0.5rem", marginBottom: "1.5rem" }}>
                  {Object.keys(selectedLinea.valores).map(key => {
                    const valObj = selectedLinea.valores[key];
                    return (
                      <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #F3F4F6", paddingBottom: "0.5rem" }}>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: "12px", fontWeight: "600", color: "#374151", textTransform: "uppercase" }}>
                            {key.replace(/_/g, ' ')}
                          </span>
                          <div style={{ fontSize: "11px", color: "#9CA3AF" }}>
                            Cálculo automático: ${valObj.valor_original.toLocaleString()}
                          </div>
                        </div>
                        <input
                          type="number"
                          placeholder={valObj.valor_original.toString()}
                          value={editedValores[valObj.id] || ''}
                          onChange={(e) => setEditedValores({
                            ...editedValores,
                            [valObj.id]: e.target.value
                          })}
                          style={{
                            width: "120px",
                            padding: "0.4rem",
                            border: "1px solid #D1D5DB",
                            borderRadius: "6px",
                            fontSize: "13px",
                            textAlign: "right"
                          }}
                        />
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: "flex", gap: "1rem" }}>
                  <button
                    type="submit"
                    disabled={saveLoading}
                    style={{
                      flex: 1,
                      padding: "0.7rem",
                      backgroundColor: "#059669",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      fontWeight: "600",
                      cursor: saveLoading ? "not-allowed" : "pointer",
                      fontSize: "14px"
                    }}
                  >
                    {saveLoading ? "Guardando..." : "Guardar cambios"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedLinea(null)}
                    style={{
                      padding: "0.7rem 1rem",
                      backgroundColor: "transparent",
                      border: "1px solid #D1D5DB",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "14px",
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
      ) : (
        <div style={{ textAlign: "center", padding: "3rem", color: "#6B7280" }}>Aún no se han subido planillas al sistema.</div>
      )}
    </div>
  );
}
