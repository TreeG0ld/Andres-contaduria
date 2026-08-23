import React, { useState } from 'react';

export default function PantallaCarga() {
  const [file, setFile] = useState(null);
  const [operador, setOperador] = useState('soi');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);

  // States for NITs wizard
  const [nitArl, setNitArl] = useState('');
  const [nitCcf, setNitCcf] = useState('');
  const [nitAfp, setNitAfp] = useState('');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(null);

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
          nit_arl: nitArl,
          nit_ccf: nitCcf,
          nit_afp: nitAfp,
        }),
      });

      const data = await response.json();
      if (data.status === 'success') {
        setMensajeExito("¡NITs guardados y planilla procesada correctamente!");
        // Trigger Excel download
        window.open(data.ruta_descarga, '_blank');
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
        {resultado && resultado.status === 'needs_config' && !mensajeExito && (
          <div style={{
            marginTop: "2.5rem",
            padding: "2rem",
            borderRadius: "12px",
            backgroundColor: "#EFF6FF",
            border: "1px solid #BFDBFE"
          }}>
            <h3 style={{ marginTop: 0, color: "#1E40AF", fontSize: "16px", fontWeight: "700" }}>
              ⚠️ Empresa no configurada
            </h3>
            <p style={{ color: "#1E3A8A", fontSize: "14px", marginBottom: "1.5rem" }}>
              Se detectó el aportante <strong>{resultado.aportante.razon_social}</strong> (NIT {resultado.aportante.numero_documento}), pero no tiene asignado los NITs de sus entidades para los créditos patronales en el archivo contable.
              <br /><br />
              Ingresa los NITs correspondientes a continuación. El sistema los guardará para este y futuros meses.
            </p>

            <form onSubmit={handleConfirmarNits} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <label style={{ fontSize: "13px", fontWeight: "600", color: "#1E3A8A" }}>NIT de la ARL:</label>
                <input
                  type="text"
                  value={nitArl}
                  onChange={(e) => setNitArl(e.target.value)}
                  placeholder="Ej: 890903790"
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
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <label style={{ fontSize: "13px", fontWeight: "600", color: "#1E3A8A" }}>NIT de la Administradora de Pensiones (AFP):</label>
                <input
                  type="text"
                  value={nitAfp}
                  onChange={(e) => setNitAfp(e.target.value)}
                  placeholder="Ej: 901465677"
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

