import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import "./PantallaPendiente.css";

gsap.registerPlugin(useGSAP);

export default function PantallaPendiente({ titulo, descripcion, fase, children, centrado = false }) {
  const ref = useRef(null);

  // Entrada "Standard" (data/motion.csv, Stagger List): cabecera y bloque
  // de contenido aparecen con un desfase corto, no de golpe.
  useGSAP(
    () => {
      gsap.from(".pantalla__cabecera, .pantalla__vacio, .carga", {
        opacity: 0,
        y: 12,
        duration: 0.35,
        stagger: 0.06,
        ease: "power1.out",
      });
    },
    { scope: ref }
  );

  return (
    <div
      className="pantalla"
      ref={ref}
      style={centrado ? { maxWidth: 480, width: "100%", margin: "0 auto" } : undefined}
    >
      <header className="pantalla__cabecera">
        <div>
          <h1>{titulo}</h1>
          <p className="pantalla__descripcion">{descripcion}</p>
        </div>
        <span className="pantalla__fase">Fase {fase}</span>
      </header>

      {children ?? (
        <div className="pantalla__vacio">
          <p>Esta pantalla se construye en la Fase {fase}, según el orden de construcción del proyecto.</p>
          <p className="pantalla__vacio-nota">Todavía no hay datos ni lógica de negocio implementados aquí.</p>
        </div>
      )}
    </div>
  );
}
