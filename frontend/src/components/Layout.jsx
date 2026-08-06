import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { ThinkingOrb } from "thinking-orbs";
import { obtenerSalud } from "../api/cliente";
import {
  IconoCarga,
  IconoHistorial,
  IconoRevision,
  IconoFormulas,
  IconoPlantillas,
  IconoTrabajadores,
} from "./iconos";
import { NavBarTubelight } from "./ui/tubelight-navbar";
import PageTransition from "./PageTransition";
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

  // Reemplaza el punto de estado por el orbe: "connecting" mientras resuelve
  // o si falló (sigue intentando comunicar algo vivo), "breathing" (calmo)
  // si quedó conectada. Nunca lo pauso: un orbe quieto lee como "roto", no
  // como "sin conexión" — esa lectura la sigue dando el texto de al lado.
  const estado = ok === true ? "breathing" : "connecting";

  return (
    <div className="estado-api">
      <ThinkingOrb
        state={estado}
        size={20}
        theme="dark"
        aria-label={
          ok === null ? "Verificando API" : ok ? "API conectada" : "Sin conexión con la API"
        }
      />
      {ok === null ? "Verificando API…" : ok ? "API conectada" : "Sin conexión con la API"}
    </div>
  );
}

// Rutas cuya pantalla pide layout centrado (ver prop `centrado` en
// PantallaPendiente/PantallaCarga) en vez del cascarón estándar arriba a
// la izquierda. Se resuelve aquí — y no con `:has()` en CSS — para no
// depender de qué tan reciente sea el motor del navegador que la renderiza.
const RUTAS_CENTRADAS = new Set(["/"]);

export default function Layout() {
  const location = useLocation();
  const centrado = RUTAS_CENTRADAS.has(location.pathname);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar__marca">
          <span className="sidebar__logo">C</span>
          <div>
            <strong>Counter</strong>
            <div className="sidebar__submarca">Nómina y aportes PILA</div>
          </div>
        </div>

        <NavBarTubelight items={NAV} />

        <div className="sidebar__pie">
          <EstadoApi />
        </div>
      </aside>

      <div
        className="contenido"
        style={
          centrado
            ? { display: "flex", alignItems: "center", justifyContent: "center" }
            : undefined
        }
      >
        <PageTransition>
          <Outlet />
        </PageTransition>
      </div>
    </div>
  );
}
