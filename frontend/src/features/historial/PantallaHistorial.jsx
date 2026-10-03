import React, { useState, useEffect } from 'react';
import Selector from '../../components/ui/Selector';
import { IconoDescarga, IconoExcel } from '../../components/iconos';
import './PantallaHistorial.css';

// Estado de la carga -> variante de insignia. El texto siempre acompaña al
// color, así que el estado se entiende aunque no se distingan los tonos.
const VARIANTE_ESTADO = {
  procesada: 'insignia--exito',
  requiere_config: 'insignia--advertencia',
};

export default function PantallaHistorial() {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filtroEmpresa, setFiltroEmpresa] = useState("TODAS");
  const [filtroPeriodo, setFiltroPeriodo] = useState("TODOS");

  const empresasUnicas = React.useMemo(() => {
    const empresas = new Set(historial.map(c => c.aportante?.razon_social || "Sin Empresa"));
    return Array.from(empresas).sort();
  }, [historial]);

  const periodosUnicos = React.useMemo(() => {
    const periodos = new Set(historial.map(c => c.periodo || "Sin Periodo"));
    return Array.from(periodos).sort().reverse();
  }, [historial]);

  const historialFiltrado = React.useMemo(() => {
    return historial.filter(c => {
      const cumpleEmpresa = filtroEmpresa === "TODAS" || (c.aportante?.razon_social || "Sin Empresa") === filtroEmpresa;
      const cumplePeriodo = filtroPeriodo === "TODOS" || (c.periodo || "Sin Periodo") === filtroPeriodo;
      return cumpleEmpresa && cumplePeriodo;
    });
  }, [historial, filtroEmpresa, filtroPeriodo]);

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

  return (
    <div className="pagina">
      <header className="pagina__cabecera">
        <div>
          <h1 className="pagina__titulo">Historial de Subidas</h1>
          <p className="pagina__descripcion">
            Aquí tienes la lista de planillas procesadas antes y sus enlaces para descargar el archivo Excel.
          </p>
        </div>
      </header>

      <div className="filtros">
        <div className="campo">
          <label className="campo__etiqueta" id="lbl-filtro-empresa" htmlFor="filtro-empresa">
            Filtrar por empresa
          </label>
          <Selector
            id="filtro-empresa"
            aria-labelledby="lbl-filtro-empresa"
            valor={filtroEmpresa}
            onChange={setFiltroEmpresa}
            opciones={[
              { valor: 'TODAS', etiqueta: 'Todas las empresas' },
              ...empresasUnicas.map(emp => ({ valor: emp, etiqueta: emp })),
            ]}
          />
        </div>

        <div className="campo">
          <label className="campo__etiqueta" id="lbl-filtro-periodo" htmlFor="filtro-periodo">
            Filtrar por periodo
          </label>
          <Selector
            id="filtro-periodo"
            aria-labelledby="lbl-filtro-periodo"
            valor={filtroPeriodo}
            onChange={setFiltroPeriodo}
            opciones={[
              { valor: 'TODOS', etiqueta: 'Todos los meses' },
              ...periodosUnicos.map(per => ({ valor: per, etiqueta: per })),
            ]}
          />
        </div>
      </div>

      {loading ? (
        <div className="cargando">Cargando historial...</div>
      ) : (
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead>
              <tr>
                <th className="historial__id">Carga</th>
                <th>Periodo</th>
                <th>Empresa</th>
                <th>Operador</th>
                <th>Fecha de subida</th>
                <th>Estado</th>
                <th className="tabla__acciones">Descarga</th>
              </tr>
            </thead>
            <tbody>
              {historialFiltrado.length === 0 ? (
                <tr>
                  <td colSpan="7" className="tabla__vacio">
                    No hay registros que coincidan con los filtros.
                  </td>
                </tr>
              ) : (
                historialFiltrado.map(h => (
                  <tr key={h.id}>
                    <td className="historial__id">#{h.id}</td>
                    <td className="historial__periodo">{h.periodo}</td>
                    <td>
                      <span className="historial__empresa">
                        {h.aportante.razon_social || "Sin empresa"}
                      </span>
                      <span className="historial__nit">NIT {h.aportante.numero_documento || "—"}</span>
                    </td>
                    <td className="historial__operador">{h.operador}</td>
                    <td className="historial__fecha">{h.creado_at}</td>
                    <td>
                      <span className={`insignia ${VARIANTE_ESTADO[h.estado] || ''}`}>
                        {h.estado.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="tabla__acciones">
                      <div className="historial__descargas">
                        {h.ruta_descarga_terceros && (
                          <a
                            href={h.ruta_descarga_terceros}
                            target="_blank"
                            rel="noreferrer"
                            className="boton boton--sm"
                          >
                            <IconoDescarga size={14} aria-hidden="true" />
                            Terceros
                          </a>
                        )}

                        {h.ruta_descarga ? (
                          <a
                            href={h.ruta_descarga}
                            target="_blank"
                            rel="noreferrer"
                            className="boton boton--sm boton--primario"
                          >
                            <IconoExcel size={14} aria-hidden="true" />
                            Nómina
                          </a>
                        ) : (
                          <span className="historial__pendiente">Pendiente</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
