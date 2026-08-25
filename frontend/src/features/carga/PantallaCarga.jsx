import React, { useState } from 'react';

export default function PantallaCarga() {
  const [file, setFile] = useState(null);
  const [operador, setOperador] = useState('soi');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);

  // States for NITs wizard
  const [nitCcf, setNitCcf] = useState('');
  const [nitAfp, setNitAfp] = useState('');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(null);

  // States for worker classifications
  const [trabajadoresUnclassified, setTrabajadoresUnclassified] = useState([]);
  const [classifications, setClassifications] = useState({});
  const [classLoading, setClassLoading] = useState(false);

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
        setNitAfp(data.aportante.nit_afp || '');
      }

      // Auto trigger download if success
      if (data.status === 'success' && data.ruta_descarga) {
        window.open(data.ruta_descarga, '_blank');
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
          nit_afp: nitAfp,
        }),
      });

      const data = await response.json();
      if (data.status === 'needs_workers_classification') {
        setTrabajadoresUnclassified(data.trabajadores);
        const initialMap = {};
        data.trabajadores.forEach(t => {
          initialMap[t.id] = "51";
        });
        setClassifications(initialMap);
      } else if (data.status === 'success') {
        setMensajeExito("planilla procesada correctamente");
        window.open(data.ruta_descarga, '_blank');
      } else {
        setResultado({ error: data.error || "Ocurrio un error al guardar los nit" });
      }
    } catch (error) {
      console.error("Error al confirmar nit:", error);
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
        setMensajeExito("¡Trabajadores clasificados y Excel generado correctamente!");
        setTrabajadoresUnclassified([]);
        window.open(data.ruta_descarga, '_blank');
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
                <label style={{ fontSize: "13px", fontWeight: "600", color: "#1E3A8A" }}>NIT de la Administradora de Pensiones (AFP):</label>
                <input
                  type="text"
                  value={nitAfp}
                  onChange={(e) => setNitAfp(e.target.value)}
                  placeholder="Ej: 900336004"
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
                {confirmLoading ? "Guardando y Generando..." : "Confirmar y Descargar Excel"}
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
              Clasificación de Clase de Gasto para Nuevos Trabajadores
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
                {classLoading ? "Guardando y Generando..." : "Guardar y Descargar Excel"}
              </button>
            </form>
          </div>
        )}

        {/* Mensaje de éxito si ya se configuró o no requería configuración */}
        {((resultado && resultado.status === 'success') || mensajeExito) && (
          <div style={{
            marginTop: "2.5rem",
            padding: "2rem",
            borderRadius: "12px",
            backgroundColor: "#ECFDF5",
            border: "1px solid #A7F3D0",
            textAlign: "center"
          }}>
            <h3 style={{ marginTop: 0, color: "#065F46", fontSize: "18px", fontWeight: "700" }}>
              Procesamiento Exitoso!
            </h3>
            <p style={{ color: "#047857", fontSize: "14px", marginBottom: "1.5rem" }}>
              {mensajeExito || `se procesó correctamente y se extrajeron ${resultado.empleados_extraidos} trabajadores.`}
            </p>
            <a
              href={`/api/cargas/descargar/${resultado.carga_id}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                padding: "0.8rem 2rem",
                backgroundColor: "#059669",
                color: "white",
                textDecoration: "none",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "15px",
                boxShadow: "0 4px 6px -1px rgba(5, 150, 105, 0.2)"
              }}
            >
              Descargar Diario Contable Excel
            </a>
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

