import { useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { useHoverLift } from "../../hooks/useHoverLift";
import "./tubelight-navbar.css";

gsap.registerPlugin(useGSAP);

// Adaptado del patrón "Tubelight Navbar" (barra flotante horizontal con un
// "lamp" que desliza con motion/react `layoutId`) a la barra lateral
// vertical de la app. Dos diferencias deliberadas frente al componente
// original que trajiste:
//  1. Vertical, no horizontal: el tubo luminoso queda pegado al borde
//     izquierdo del ítem activo en vez de flotar arriba.
//  2. Ruteo real: el activo sale de useLocation()/NavLink (esta es una app
//     con rutas de verdad), no de un useState interno tipo demo de ancla "#".
//  3. Íconos Phosphor en vez de lucide-react, para no mezclar dos lenguajes
//     visuales de ícono en la misma app (ver iconos.jsx).
function ItemTubelight({ to, etiqueta, Icono, fin }) {
  const location = useLocation();
  const activo = fin ? location.pathname === to : location.pathname.startsWith(to);
  const hover = useHoverLift({ y: -1, duration: 0.15 });

  return (
    <NavLink
      ref={hover.ref}
      to={to}
      end={fin}
      className={"tubelight-nav__item" + (activo ? " es-activo" : "")}
      onMouseEnter={hover.onMouseEnter}
      onMouseLeave={hover.onMouseLeave}
    >
      <span className="tubelight-nav__icono">
        <Icono size={18} />
      </span>
      <span className="tubelight-nav__etiqueta">{etiqueta}</span>

      {activo && (
        <motion.span
          layoutId="tubelight-lampara"
          className="tubelight-nav__lampara"
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        >
          <span className="tubelight-nav__tubo" />
          <span className="tubelight-nav__halo" />
        </motion.span>
      )}
    </NavLink>
  );
}

export function NavBarTubelight({ items, className = "" }) {
  const ref = useRef(null);

  useGSAP(
    () => {
      gsap.from(".tubelight-nav__item", {
        opacity: 0,
        y: 8,
        duration: 0.3,
        stagger: 0.035,
        ease: "power1.out",
      });
    },
    { scope: ref }
  );

  return (
    <nav className={`tubelight-nav ${className}`} ref={ref}>
      {items.map((item) => (
        <ItemTubelight key={item.to} {...item} />
      ))}
    </nav>
  );
}
