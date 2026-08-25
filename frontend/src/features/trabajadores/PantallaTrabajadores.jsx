import React, { useState, useEffect } from 'react';

export default function PantallaTrabajadores() {
  const [trabajadores, setTrabajadores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [mensaje, setMensaje] = useState(null);

  useEffect(() => {
    fetchTrabajadores();
  }, []);

  const fetchTrabajadores = () => {
    setLoading(true);
    fetch('/api/trabajadores')
      .then(res => res.json())
      .then(data => {
        setTrabajadores(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error al cargar trabajadores:", err);
        setLoading(false);
      });
  };

  const handleClaseGastoChange = async (id, newClase) => {
    setMensaje(null);
    try {
      const response = await fetch(`/api/trabajadores/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clase_gasto: newClase })
      });
      const data = await response.json();
      if (data.status === 'success') {
        setMensaje({ tipo: 'success', texto: "¡Listo! Clase de gasto guardada." });
        setTrabajadores(trabajadores.map(t => t.id === id ? { ...t, clase_gasto: newClase } : t));
      } else {
        setMensaje({ tipo: 'error', texto: data.error || "Error al actualizar." });
      }
    } catch (err) {
      console.error(err);
      setMensaje({ tipo: 'error', texto: "Error de conexión." });
    }
  };

  const filteredWorkers = trabajadores.filter(t => 
    t.nombre_completo.toLowerCase().includes(search.toLowerCase()) ||
    t.numero_documento.includes(search)
  );

  return (
    <div style={{ padding: "2rem", fontFamily: "'Outfit', sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "24px", color: "#1E3A8A", fontWeight: "700" }}>Lista de Trabajadores</h1>
          <p style={{ margin: 0, color: "#6B7280", fontSize: "14px" }}>Aquí puedes ver y cambiar la clase de gasto contable de cada trabajador.</p>
        </div>

        <input
          type="text"
          placeholder="Buscar trabajador..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "0.5rem 1rem",
            width: "300px",
            borderRadius: "8px",
            border: "1px solid #D1D5DB",
            fontSize: "14px"
          }}
        />
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
        <div style={{ textAlign: "center", padding: "3rem", color: "#6B7280" }}>Cargando trabajadores...</div>
      ) : (
        <div style={{ background: "white", borderRadius: "12px", border: "1px solid #E5E7EB", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ backgroundColor: "#F9FAFB", borderBottom: "1px solid #E5E7EB", textAlign: "left" }}>
                <th style={{ padding: "0.75rem" }}>Empleado</th>
                <th style={{ padding: "0.75rem" }}>Tipo Doc</th>
                <th style={{ padding: "0.75rem" }}>Cédula</th>
                <th style={{ padding: "0.75rem" }}>Clase de gasto</th>
              </tr>
            </thead>
            <tbody>
              {filteredWorkers.map(t => (
                <tr key={t.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                  <td style={{ padding: "0.75rem", fontWeight: "500", color: "#111827" }}>{t.nombre_completo}</td>
                  <td style={{ padding: "0.75rem", color: "#6B7280" }}>{t.tipo_documento}</td>
                  <td style={{ padding: "0.75rem", color: "#374151" }}>{t.numero_documento}</td>
                  <td style={{ padding: "0.75rem" }}>
                    <select
                      value={t.clase_gasto}
                      onChange={(e) => handleClaseGastoChange(t.id, e.target.value)}
                      style={{
                        padding: "0.4rem",
                        borderRadius: "6px",
                        border: "1px solid #D1D5DB",
                        fontSize: "13px",
                        fontWeight: "600",
                        backgroundColor: t.clase_gasto === "72" ? "#FEF3C7" : t.clase_gasto === "52" ? "#E0F2FE" : "#F3F4F6",
                        color: t.clase_gasto === "72" ? "#92400E" : t.clase_gasto === "52" ? "#0369A1" : "#374151"
                      }}
                    >
                      <option value="51">51 - Administración</option>
                      <option value="52">52 - Ventas</option>
                      <option value="72">72 - Producción / Operativo</option>
                    </select>
                  </td>
                </tr>
              ))}
              {filteredWorkers.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ textAlign: "center", padding: "2rem", color: "#9CA3AF" }}>
                    Aún no hay trabajadores en el sistema o no coinciden con la búsqueda.
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
