import { NavLink, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { obtenerSalud } from "../api/cliente";
import {
  IconoCarga,
  IconoHistorial,
  IconoRevision,
  IconoFormulas,
  IconoPlantillas,
  IconoTrabajadores,
} from "./iconos";
import "./Layout.css";

const NAV = [
  { to: "/", etiqueta: "Nueva carga", Icono: IconoCarga, fin: true },
  { to: "/historial", etiqueta: "Historial de cargas", Icono: IconoHistorial },
  { to: "/revision", etiqueta: "Revisión", Icono: IconoRevision },
  { to: "/formulas", etiqueta: "Fórmulas", Icono: IconoFormulas },
  { to: "/plantillas", etiqueta: "Plantillas", Icono: IconoPlantillas },
  { to: "/trabajadores", etiqueta: "Trabajadores", Icono: IconoTrabajadores },
];

function EstadoApi() {
  const [ok, setOk] = useState(null);

  useEffect(() => {
    obtenerSalud()
      .then(() => setOk(true))
      .catch(() => setOk(false));
  }, []);

  return (
    <div className="estado-api">
      <span
        className={`estado-api__punto ${
          ok === null ? "es-cargando" : ok ? "es-ok" : "es-error"
        }`}
      />
      {ok === null ? "Verificando API…" : ok ? "API conectada" : "Sin conexión con la API"}
    </div>
  );
}

export default function Layout() {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar__marca">
          <span className="sidebar__logo">P</span>
          <div>
            <strong>PILA</strong>
            <div className="sidebar__submarca">Nómina y aportes</div>
          </div>
        </div>

        <nav className="sidebar__nav">
          {NAV.map(({ to, etiqueta, Icono, fin }) => (
            <NavLink
              key={to}
              to={to}
              end={fin}
              className={({ isActive }) =>
                "sidebar__item" + (isActive ? " es-activo" : "")
              }
            >
              <Icono />
              {etiqueta}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__pie">
          <EstadoApi />
        </div>
      </aside>

      <div className="contenido">
        <Outlet />
      </div>
    </div>
  );
}
