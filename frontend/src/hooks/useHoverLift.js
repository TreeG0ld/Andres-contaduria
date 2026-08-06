import { useCallback, useRef } from "react";
import { gsap } from "gsap";

// Tier "Subtle" del preset de hover (GSAP): desplazamiento < 2px, solo
// transform/opacity, se queda en el compositor. Ver .claude/skills/gsap-core
// y ui-ux-pro-max (data/motion.csv, categoría "Hover Micro-interaction").
function prefiereMovimientoReducido() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Hover con GSAP para un elemento interactivo real (no usar en controles
 * deshabilitados: la animación implica "esto responde", y sería engañoso).
 * Se conecta directo a onMouseEnter/onMouseLeave — sin listeners manuales,
 * sin necesidad de cleanup en el efecto.
 */
export function useHoverLift({
  y = -2,
  scale = 1,
  duration = 0.18,
  ease = "power1.out",
} = {}) {
  const ref = useRef(null);

  const onMouseEnter = useCallback(() => {
    if (!ref.current || prefiereMovimientoReducido()) return;
    gsap.to(ref.current, { y, scale, duration, ease, overwrite: "auto" });
  }, [y, scale, duration, ease]);

  const onMouseLeave = useCallback(() => {
    if (!ref.current || prefiereMovimientoReducido()) return;
    gsap.to(ref.current, { y: 0, scale: 1, duration, ease, overwrite: "auto" });
  }, [duration, ease]);

  return { ref, onMouseEnter, onMouseLeave };
}
