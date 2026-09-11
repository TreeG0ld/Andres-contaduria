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
  MagnifyingGlass,
  CheckCircle,
  WarningCircle,
  Warning,
  Info,
  DownloadSimple,
  FilePdf,
  FileXls,
  PencilSimple,
  X,
  ArrowClockwise,
  Buildings,
  LockSimple,
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

export function IconoBuscar(props) {
  return <MagnifyingGlass weight={PESO} {...props} />;
}

export function IconoExito(props) {
  return <CheckCircle weight={PESO} {...props} />;
}

export function IconoError(props) {
  return <WarningCircle weight={PESO} {...props} />;
}

export function IconoAdvertencia(props) {
  return <Warning weight={PESO} {...props} />;
}

export function IconoInfo(props) {
  return <Info weight={PESO} {...props} />;
}

export function IconoDescarga(props) {
  return <DownloadSimple weight={PESO} {...props} />;
}

export function IconoPdf(props) {
  return <FilePdf weight={PESO} {...props} />;
}

export function IconoExcel(props) {
  return <FileXls weight={PESO} {...props} />;
}

export function IconoEditar(props) {
  return <PencilSimple weight={PESO} {...props} />;
}

export function IconoCerrar(props) {
  return <X weight={PESO} {...props} />;
}

export function IconoReintentar(props) {
  return <ArrowClockwise weight={PESO} {...props} />;
}

export function IconoEmpresa(props) {
  return <Buildings weight={PESO} {...props} />;
}

export function IconoCandado(props) {
  return <LockSimple weight={PESO} {...props} />;
}
