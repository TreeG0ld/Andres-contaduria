import React, { useState, useEffect } from 'react';

export default function PantallaCarga() {
  const [file, setFile] = useState(null);
  const [operador, setOperador] = useState('soi');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);

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
    } catch (err) {
      console.error("Error al cargar revisión:", err);
      setMensajeRevision({ tipo: 'error', texto: "Error al conectar con el servidor para revisión." });
    } finally {
      setRevisionLoading(false);
    }
  };

  const handleTogglePagoNoSalarial = async (lineaId, aplica) => {
    setIsUpdating(true); // Disable interface & show feedback
    try {
      const res = await fetch(`/api/revision/${revisionCargaId}/toggle_pago_no_salarial`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          linea_id: lineaId,
          aplica: aplica,
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        // Fetch fresh calculations
        const refreshRes = await fetch(`/api/revision/${revisionCargaId}`);
        const freshData = await refreshRes.json();
        setRevisionData(freshData);
      } else {
        setMensajeRevision({ tipo: 'error', texto: data.error || "Error al actualizar Pago No Salarial" });
      }
    } catch (err) {
      console.error(err);
      setMensajeRevision({ tipo: 'error', texto: "Error al actualizar Pago No Salarial" });
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
        setMensajeRevision({ tipo: 'success', texto: "¡Archivo Excel generado! Iniciando descarga..." });
        
        // Programmatic download to bypass popup blockers
        const downloadUrl = data.ruta_descarga;
        const link = document.createElement('a');
        link.href = downloadUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        setMensajeRevision({ tipo: 'error', texto: data.error || "Error al generar Excel" });
      }
    } catch (err) {
      console.error(err);
      setMensajeRevision({ tipo: 'error', texto: "Error de conexión." });
    } finally {
      setExcelLoading(false);
    }
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
    return (
      <div style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto", fontFamily: "'Outfit', sans-serif" }}>
        <div style={{
          background: "white",
          borderRadius: "16px",
          padding: "2.5rem",
          border: "1px solid #E5E7EB",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)",
          position: "relative" // For spinner overlay
        }}>
          {/* Visual feedback overlay during calculation */}
          {isUpdating && (
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(255, 255, 255, 0.6)",
              backdropFilter: "blur(2px)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              borderRadius: "16px",
              zIndex: 10
            }}>
              <div style={{
                padding: "1rem 2rem",
                background: "#1E3A8A",
                color: "white",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "14px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem"
              }}>
                <span className="spinner-animation" style={{
                  display: "inline-block",
                  width: "16px",
                  height: "16px",
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "white",
                  borderRadius: "50%",
                  animation: "spin 0.6s linear infinite"
                }}></span>
                Recalculando fórmulas...
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <div>
              <h1 style={{
                fontSize: "24px",
                fontWeight: "700",
                margin: 0,
                color: "#1E3A8A"
              }}>
                Revisión de Cálculos Contables
              </h1>
              <p style={{ color: "#6B7280", margin: 0, fontSize: "14px" }}>
                Revisa los montos y selecciona a quién le aplica el Pago No Salarial antes de exportar el Excel.
              </p>
            </div>
            <button
              onClick={handleResetCarga}
              disabled={isUpdating}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "transparent",
                border: "1px solid #D1D5DB",
                borderRadius: "6px",
                fontSize: "13px",
                cursor: isUpdating ? "not-allowed" : "pointer",
                color: "#4B5563"
              }}
            >
              Cargar otro PDF
            </button>
          </div>

          {mensajeRevision && (
            <div style={{
              padding: "1rem",
              borderRadius: "8px",
              marginBottom: "1.5rem",
              backgroundColor: mensajeRevision.tipo === 'success' ? '#ECFDF5' : '#FEF2F2',
              border: `1px solid ${mensajeRevision.tipo === 'success' ? '#10B981' : '#EF4444'}`,
              color: mensajeRevision.tipo === 'success' ? '#065F46' : '#991B1B',
              fontSize: "14px",
              fontWeight: "500"
            }}>
              {mensajeRevision.texto}
            </div>
          )}

          {revisionLoading ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "#6B7280" }}>Cargando datos calculados para revisión...</div>
          ) : revisionData ? (
            <div>
              <div style={{ overflowX: "auto", marginBottom: "2rem" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#F9FAFB", borderBottom: "1px solid #E5E7EB", textAlign: "left" }}>
                      <th style={{ padding: "0.75rem" }}>Empleado</th>
                      <th style={{ padding: "0.75rem" }}>Cédula</th>
                      <th style={{ padding: "0.75rem" }}>Gasto</th>
                      <th style={{ padding: "0.75rem" }}>Pago No Salarial</th>
                      <th style={{ padding: "0.75rem" }}>Neto a Pagar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revisionData.lineas.map((l) => {
                      const salNetoObj = l.valores.salario_por_pagar;
                      const valNeto = salNetoObj ? salNetoObj.valor_actual : 0;
                      return (
                        <tr key={l.linea_id} style={{ borderBottom: "1px solid #F3F4F6" }}>
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
                          <td style={{ padding: "0.75rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <input
                                type="checkbox"
                                checked={l.aplica_no_salarial}
                                disabled={isUpdating}
                                onChange={(e) => handleTogglePagoNoSalarial(l.linea_id, e.target.checked)}
                                style={{ cursor: isUpdating ? "not-allowed" : "pointer", width: "16px", height: "16px" }}
                              />
                              <span style={{ fontSize: "12px", color: "#4B5563" }}>
                                {l.aplica_no_salarial ? "Aplicado" : "No aplica"}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: "0.75rem", fontWeight: "600", color: "#059669" }}>
                            ${valNeto.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={handleDescargarExcel}
                  disabled={excelLoading || isUpdating}
                  style={{
                    padding: "1rem 2rem",
                    backgroundColor: (excelLoading || isUpdating) ? "#9CA3AF" : "#2563EB",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: "600",
                    fontSize: "15px",
                    cursor: (excelLoading || isUpdating) ? "not-allowed" : "pointer",
                    boxShadow: (excelLoading || isUpdating) ? "none" : "0 4px 6px -1px rgba(37, 99, 235, 0.2)",
                    transition: "background-color 0.2s"
                  }}
                >
                  {excelLoading ? "Generando Diario Contable..." : "Descargar Excel Final"}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "2rem", color: "#EF4444" }}>No se pudieron cargar los datos de revisión.</div>
          )}
        </div>
        
        {/* Style injection for spinner */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}} />
      </div>
    );
  }

  // Upload/Config/Classification UI
  return (
    <div style={{ padding: "2rem", maxWidth: "650px", margin: "0 auto", fontFamily: "'Outfit', sans-serif" }}>
      <div style={{
        background: "rgba(255, 255, 255, 0.7)",
        backdropFilter: "blur(12px)",
        borderRadius: "16px",
        padding: "2.5rem",
        border: "1px solid rgba(229, 231, 235, 0.5)",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)"
      }}>
        <h1 style={{
          fontSize: "26px",
          fontWeight: "700",
          marginBottom: "0.5rem",
          background: "linear-gradient(to right, #2563EB, #4F46E5)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent"
        }}>
          Cargar Planilla PILA
        </h1>
        <p style={{ color: "#6B7280", marginBottom: "2rem", fontSize: "14px" }}>
          Sube el archivo PDF para extraer la información y generar el diario contable de nómina.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Archivo PDF */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label htmlFor="pdf" style={{ fontWeight: "600", fontSize: "14px", color: "#374151" }}>
              Archivo PDF de la Planilla:
            </label>
            <div style={{
              border: "2px dashed #D1D5DB",
              borderRadius: "8px",
              padding: "1.5rem",
              textAlign: "center",
              cursor: "pointer",
              transition: "border-color 0.2s",
              backgroundColor: "#F9FAFB"
            }}>
              <input
                type="file"
                id="pdf"
                accept="application/pdf"
                onChange={handleFileChange}
                style={{ cursor: "pointer" }}
                required
              />
            </div>
          </div>

          {/* Operador */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label htmlFor="operador" style={{ fontWeight: "600", fontSize: "14px", color: "#374151" }}>
              Operador PILA:
            </label>
            <select
              id="operador"
              value={operador}
              onChange={(e) => setOperador(e.target.value)}
              style={{
                padding: "0.75rem",
                border: "1px solid #D1D5DB",
                borderRadius: "8px",
                backgroundColor: "#fff",
                fontSize: "14px",
                color: "#1F2937",
                outline: "none"
              }}
            >
              <option value="soi">SOI (Planilla de Aportes)</option>
              <option value="arus">ARUS</option>
              <option value="simple">SIMPLE</option>
              <option value="aportes_en_linea">APORTES EN LINEA</option>
            </select>
          </div>

          {/* Botón de Enviar */}
          <button
            type="submit"
            disabled={!file || loading}
            style={{
              padding: "1rem",
              backgroundColor: loading || !file ? "#9CA3AF" : "#2563EB",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontWeight: "600",
              fontSize: "15px",
              cursor: loading || !file ? "not-allowed" : "pointer",
              marginTop: "0.5rem",
              boxShadow: loading || !file ? "none" : "0 4px 6px -1px rgba(37, 99, 235, 0.2)",
              transition: "background-color 0.2s"
            }}
          >
            {loading ? "Procesando y Calculando..." : "Subir y Calcular Nómina"}
          </button>
        </form>

        {/* Mago de configuración de NITs si la empresa no los tiene */}
        {resultado && resultado.status === 'needs_config' && trabajadoresUnclassified.length === 0 && !mensajeExito && (
          <div style={{
            marginTop: "2.5rem",
            padding: "2rem",
            borderRadius: "12px",
            backgroundColor: "#EFF6FF",
            border: "1px solid #BFDBFE"
          }}>
            <form onSubmit={handleConfirmarNits} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <label style={{ fontSize: "13px", fontWeight: "600", color: "#1E3A8A" }}>NIT de la Administradora de Riesgos Laborales (ARL):</label>
                <input
                  type="text"
                  value={nitArl}
                  onChange={(e) => setNitArl(e.target.value)}
                  placeholder="Ej: 860011153"
                  style={{ padding: "0.6rem", border: "1px solid #93C5FD", borderRadius: "6px", fontSize: "14px" }}
                  required
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <label style={{ fontSize: "13px", fontWeight: "600", color: "#1E3A8A" }}>NIT de la Caja de Compensación (CCF):</label>
                <input
                  type="text"
                  value={nitCcf}
                  onChange={(e) => setNitCcf(e.target.value)}
                  placeholder="Ej: 890900841"
                  style={{ padding: "0.6rem", border: "1px solid #93C5FD", borderRadius: "6px", fontSize: "14px" }}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={confirmLoading}
                style={{
                  padding: "0.8rem",
                  backgroundColor: "#1D4ED8",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: "600",
                  cursor: confirmLoading ? "not-allowed" : "pointer",
                  marginTop: "0.5rem"
                }}
              >
                {confirmLoading ? "Guardando..." : "Confirmar y Continuar"}
              </button>
            </form>
          </div>
        )}

        {/* Clasificación interactiva de trabajadores (51/52/72) */}
        {resultado && resultado.status === 'needs_config' && trabajadoresUnclassified.length > 0 && !mensajeExito && (
          <div style={{
            marginTop: "2.5rem",
            padding: "2rem",
            borderRadius: "12px",
            backgroundColor: "#F0FDF4",
            border: "1px solid #BBF7D0"
          }}>
            <h4 style={{ marginTop: 0, color: "#166534", fontSize: "15px", fontWeight: "700" }}>
              Clasificación de Clase de Gasto de los Trabajadores
            </h4>
            <p style={{ color: "#14532D", fontSize: "13px", marginBottom: "1rem" }}>
              Asigna a cada empleado su correspondiente código contable de gasto (51 = Administración, 52 = Ventas, 72 = Producción).
            </p>
            <form onSubmit={handleClasificarTrabajadores} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ maxHeight: "250px", overflowY: "auto", border: "1px solid #D1D5DB", borderRadius: "6px", backgroundColor: "white" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#F3F4F6", borderBottom: "1px solid #E5E7EB", textAlign: "left" }}>
                      <th style={{ padding: "0.5rem" }}>Trabajador</th>
                      <th style={{ padding: "0.5rem" }}>Cédula</th>
                      <th style={{ padding: "0.5rem" }}>Clase Gasto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trabajadoresUnclassified.map((t) => (
                      <tr key={t.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                        <td style={{ padding: "0.5rem" }}>{t.nombre_completo}</td>
                        <td style={{ padding: "0.5rem" }}>{t.numero_documento}</td>
                        <td style={{ padding: "0.5rem" }}>
                          <select
                            value={classifications[t.id] || "51"}
                            onChange={(e) => setClassifications({
                              ...classifications,
                              [t.id]: e.target.value
                            })}
                            style={{ padding: "0.3rem", borderRadius: "4px", border: "1px solid #D1D5DB" }}
                          >
                            <option value="51">51 - Administración</option>
                            <option value="52">52 - Ventas</option>
                            <option value="72">72 - Producción</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="submit"
                disabled={classLoading}
                style={{
                  padding: "0.8rem",
                  backgroundColor: "#166534",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: "600",
                  cursor: classLoading ? "not-allowed" : "pointer"
                }}
              >
                {classLoading ? "Guardando..." : "Guardar y Ver Revisión"}
              </button>
            </form>
          </div>
        )}

        {/* Errores del Servidor */}
        {resultado && resultado.error && (
          <div style={{
            marginTop: "2.5rem",
            padding: "1.5rem",
            borderRadius: "8px",
            backgroundColor: "#FEE2E2",
            border: "1px solid #FCA5A5",
            color: "#B91C1C",
            fontSize: "14px"
          }}>
            <strong>Error:</strong> {resultado.error}
          </div>
        )}
      </div>
    </div>
  );
}
