import React, { useState, useEffect } from 'react';

export default function PantallaHistorial() {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchHistorial();
  }, []);

  const fetchHistorial = () => {
    setLoading(true);
    fetch('/api/cargas/historial')
      .then(res => res.json())
      .then(data => {
        setHistorial(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error al cargar historial:", err);
        setLoading(false);
      });
  };

  const getBadgeStyle = (estado) => {
    switch (estado) {
      case 'procesada':
        return { backgroundColor: "#D1FAE5", color: "#065F46" };
      case 'requiere_config':
        return { backgroundColor: "#FEF3C7", color: "#92400E" };
      default:
        return { backgroundColor: "#F3F4F6", color: "#374151" };
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "'Outfit', sans-serif" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ margin: 0, fontSize: "24px", color: "#1E3A8A", fontWeight: "700" }}>Historial de Subidas</h1>
        <p style={{ margin: 0, color: "#6B7280", fontSize: "14px" }}>Aquí tienes la lista de planillas procesadas antes y sus enlaces para descargar el archivo Excel.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#6B7280" }}>Cargando historial...</div>
      ) : (
        <div style={{ background: "white", borderRadius: "12px", border: "1px solid #E5E7EB", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ backgroundColor: "#F9FAFB", borderBottom: "1px solid #E5E7EB", textAlign: "left" }}>
                <th style={{ padding: "0.75rem", width: "80px" }}>Carga</th>
                <th style={{ padding: "0.75rem" }}>Periodo</th>
                <th style={{ padding: "0.75rem" }}>Empresa</th>
                <th style={{ padding: "0.75rem" }}>Operador</th>
                <th style={{ padding: "0.75rem" }}>Fecha de subida</th>
                <th style={{ padding: "0.75rem" }}>Estado</th>
                <th style={{ padding: "0.75rem", textAlign: "right" }}>Descarga</th>
              </tr>
            </thead>
            <tbody>
              {historial.map(h => (
                <tr key={h.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                  <td style={{ padding: "0.75rem", fontWeight: "600", color: "#4B5563" }}>#{h.id}</td>
                  <td style={{ padding: "0.75rem", fontWeight: "600", color: "#1E40AF" }}>{h.periodo}</td>
                  <td style={{ padding: "0.75rem", color: "#111827", fontWeight: "500" }}>
                    {h.aportante.razon_social} <span style={{ color: "#6B7280", fontSize: "11px" }}>(NIT {h.aportante.numero_documento})</span>
                  </td>
                  <td style={{ padding: "0.75rem", textTransform: "uppercase" }}>{h.operador}</td>
                  <td style={{ padding: "0.75rem", color: "#4B5563" }}>{h.creado_at}</td>
                  <td style={{ padding: "0.75rem" }}>
                    <span style={{
                      padding: "0.2rem 0.6rem",
                      borderRadius: "9999px",
                      fontSize: "11px",
                      fontWeight: "600",
                      ...getBadgeStyle(h.estado)
                    }}>
                      {h.estado.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem", textAlign: "right" }}>
                    {h.ruta_descarga ? (
                      <a
                        href={h.ruta_descarga}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: "inline-block",
                          padding: "0.3rem 0.8rem",
                          backgroundColor: "#059669",
                          color: "white",
                          borderRadius: "6px",
                          textDecoration: "none",
                          fontSize: "12px",
                          fontWeight: "600"
                        }}
                      >
                        Descargar Excel
                      </a>
                    ) : (
                      <span style={{ color: "#9CA3AF", fontSize: "12px", fontStyle: "italic" }}>Pendiente</span>
                    )}
                  </td>
                </tr>
              ))}
              {historial.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "2rem", color: "#9CA3AF" }}>
                    Aún no hay planillas registradas en el historial.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
