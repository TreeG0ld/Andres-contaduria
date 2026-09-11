import React, { useState, useEffect } from 'react';
import Aviso from '../../components/Aviso';
import Selector from '../../components/ui/Selector';
import { IconoBuscar } from '../../components/iconos';
import './PantallaTrabajadores.css';

const CLASES_GASTO = [
  { valor: '51', etiqueta: '51 - Administración' },
  { valor: '52', etiqueta: '52 - Ventas' },
  { valor: '72', etiqueta: '72 - Producción / Operativo' },
];

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
        setMensaje({ tipo: 'exito', texto: "¡Listo! Clase de gasto guardada." });
        setTrabajadores(trabajadores.map(t => t.id === id ? { ...t, clase_gasto: newClase } : t));
      } else {
        setMensaje({ tipo: 'peligro', texto: data.error || "Error al actualizar." });
      }
    } catch (err) {
      console.error(err);
      setMensaje({ tipo: 'peligro', texto: "Error de conexión." });
    }
  };

  const filteredWorkers = trabajadores.filter(t =>
    t.nombre_completo.toLowerCase().includes(search.toLowerCase()) ||
    t.numero_documento.includes(search)
  );

  return (
    <div className="pagina">
      <header className="pagina__cabecera">
        <div>
          <h1 className="pagina__titulo">Lista de Trabajadores</h1>
          <p className="pagina__descripcion">
            Aquí puedes ver y cambiar la clase de gasto contable de cada trabajador.
          </p>
        </div>

        <div className="trabajadores__buscador">
          <IconoBuscar size={16} aria-hidden="true" />
          <input
            type="search"
            className="control"
            placeholder="Buscar trabajador..."
            aria-label="Buscar trabajador por nombre o cédula"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}

      {loading ? (
        <div className="cargando">Cargando trabajadores...</div>
      ) : (
        <>
          <p className="trabajadores__conteo" role="status">
            {filteredWorkers.length}
            {filteredWorkers.length === 1 ? ' trabajador' : ' trabajadores'}
            {search && ` que coinciden con "${search}"`}
          </p>

          <div className="tabla-envoltura">
            <table className="tabla">
              <thead>
                <tr>
                  <th className="trabajadores__nombre">Empleado</th>
                  <th>Tipo Doc</th>
                  <th>Cédula</th>
                  <th className="trabajadores__clase">Clase de gasto</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkers.map(t => (
                  <tr key={t.id}>
                    <td className="tabla__principal">{t.nombre_completo}</td>
                    <td>{t.tipo_documento}</td>
                    <td className="trabajadores__doc">{t.numero_documento}</td>
                    <td>
                      <Selector
                        compacto
                        opciones={CLASES_GASTO}
                        valor={t.clase_gasto}
                        aria-label={`Clase de gasto de ${t.nombre_completo}`}
                        onChange={(nuevo) => handleClaseGastoChange(t.id, nuevo)}
                      />
                    </td>
                  </tr>
                ))}
                {filteredWorkers.length === 0 && (
                  <tr>
                    <td colSpan="4" className="tabla__vacio">
                      Aún no hay trabajadores en el sistema o no coinciden con la búsqueda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
