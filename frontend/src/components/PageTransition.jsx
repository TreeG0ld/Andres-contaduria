import { motion, useReducedMotion } from "motion/react";
import { useLocation } from "react-router-dom";

// Transición de entrada por ruta (tier "Subtle" de page transition:
// fade + 8px, 220ms). Usamos `motion` en vez de GSAP aquí porque necesita
// enganchar el cambio de ruta declarativo de React Router: `key` sobre la
// ruta actual hace que React remonte el nodo y `motion` la anime al entrar.
// El hover del resto de la app sigue en GSAP (ver useHoverLift).
export default function PageTransition({ children }) {
  const location = useLocation();
  const sinMovimiento = useReducedMotion();

  return (
    <motion.div
      key={location.pathname}
      style={{ width: "100%" }}
      initial={sinMovimiento ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
