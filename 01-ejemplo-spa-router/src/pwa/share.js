// navigator.share() abre el menú nativo de compartir del sistema operativo.
// La app no sabe a qué contactos o apps se comparte: eso lo decide el usuario.

// Si el navegador no la soporta, navigator.share simplemente no existe.
export function supportsShare() {
  return typeof navigator.share === "function";
}

// canShare() valida los datos ANTES de abrir el menú (también sirve para archivos).
// Algunos navegadores tienen share() pero no canShare(): en ese caso intentamos igual.
export function canShare(data) {
  if (!supportsShare()) return false;
  return typeof navigator.canShare === "function" ? navigator.canShare(data) : true;
}

// Devuelve cómo terminó: "shared", "cancelled" o "copied" (plan B).
// IMPORTANTE: debe llamarse directamente desde un gesto del usuario (clic).
// Si antes se hace un await lento, el navegador puede rechazar el share.
export async function shareContent(data) {
  if (canShare(data)) {
    try {
      await navigator.share(data);
      return "shared";
    } catch (error) {
      // AbortError = el usuario cerró el menú. No es un fallo de la app.
      if (error.name === "AbortError") return "cancelled";
      throw error; // NotAllowedError, TypeError…: que los vea quien llamó
    }
  }

  // Plan B: sin menú nativo, copiamos el contenido al portapapeles.
  await copyToClipboard(data);
  return "copied";
}

async function copyToClipboard({ text, url }) {
  const content = [text, url].filter(Boolean).join("\n");
  await navigator.clipboard.writeText(content);
}
