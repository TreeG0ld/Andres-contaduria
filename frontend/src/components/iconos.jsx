// Set de íconos profesional (Phosphor, peso "regular"), un solo lenguaje
// visual y grosor consistente en toda la app — reemplaza los trazos SVG
// hechos a mano. Se re-exportan con los mismos nombres que ya usaba el
// resto del código para no tocar cada pantalla.
import {
  UploadSimple,
  CloudArrowUp,
  ClockCounterClockwise,
  ListChecks,
  Calculator,
  FileText,
  Users,
} from "@phosphor-icons/react";

const PESO = "regular";

export function IconoCarga(props) {
  return <UploadSimple weight={PESO} {...props} />;
}

export function IconoSubida(props) {
  return <CloudArrowUp weight={PESO} {...props} />;
}

export function IconoHistorial(props) {
  return <ClockCounterClockwise weight={PESO} {...props} />;
}

export function IconoRevision(props) {
  return <ListChecks weight={PESO} {...props} />;
}

export function IconoFormulas(props) {
  return <Calculator weight={PESO} {...props} />;
}

export function IconoPlantillas(props) {
  return <FileText weight={PESO} {...props} />;
}

export function IconoTrabajadores(props) {
  return <Users weight={PESO} {...props} />;
}
