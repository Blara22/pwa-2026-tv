export function supportsGeolocation() {
  return "geolocation" in navigator;
}

const READ_OPTIONS = {
  enableHighAccuracy: true, // true = GPS (preciso, más batería); false = Wi-Fi/antenas
  timeout: 10000, // milisegundos máximos de espera por la lectura
  maximumAge: 60000, // acepta una lectura guardada de hasta 60 s (responde más rápido)
};

let lastPosition = null;

// La API original usa callbacks (éxito, error, opciones). La envolvemos en una
// Promise para poder usar async/await en la vista.
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        lastPosition = toReading(position);
        resolve(lastPosition);
      },
      reject, // el error llega como GeolocationPositionError
      READ_OPTIONS
    );
  });
}

// Guardamos la última lectura para reutilizarla (p. ej. al compartirla)
// sin tener que pedirla otra vez.
export function getLastPosition() {
  return lastPosition;
}

// GeolocationPosition trae más datos (altitud, rumbo, velocidad…).
// Nos quedamos solo con lo que usa la app y la dejamos como objeto plano.
function toReading(position) {
  const { latitude, longitude, accuracy } = position.coords;
  return { latitude, longitude, accuracy, timestamp: position.timestamp };
}

export function describeError(error) {
  switch (error.code) {
    case 1: // PERMISSION_DENIED
      return "Permiso denegado. Para volver a intentarlo, habilita la ubicación en la configuración del sitio.";
    case 2: // POSITION_UNAVAILABLE
      return "No se pudo determinar la ubicación (sin señal de GPS o de red).";
    case 3: // TIMEOUT
      return "Se agotó el tiempo de espera de la lectura.";
    default:
      return "Ocurrió un error inesperado al leer la ubicación.";
  }
}

export function buildMapUrl({ latitude, longitude }) {
  const lat = latitude.toFixed(5);
  const lon = longitude.toFixed(5);
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;
}


let permissionQuery = null;

function queryPermission() {
  // Guardamos la consulta para reutilizar el mismo PermissionStatus.
  if (!permissionQuery) {
    permissionQuery = navigator.permissions.query({ name: "geolocation" });
  }
  return permissionQuery;
}

export async function getPermissionState() {
  if (!navigator.permissions?.query) return "unknown";

  try {
    return (await queryPermission()).state;
  } catch (error) {
    console.warn("[PWA] No se pudo consultar el permiso: ", error);
    return "unknown";
  }
}

export async function onPermissionChange(callback) {
  if (!navigator.permissions?.query) return;

  try {
    const status = await queryPermission();
    status.onchange = () => callback(status.state);
  } catch (error) {
    console.warn("[PWA] No se pudo observar el permiso: ", error);
  }
}

const WATCH_OPTIONS = { enableHighAccuracy: true, maximumAge: 0 };

let watchId = null;

export function startWatch(onUpdate, onError) {
  if (watchId !== null) return; // ya hay un seguimiento activo

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      lastPosition = toReading(position);
      onUpdate(lastPosition);
    },
    onError,
    WATCH_OPTIONS
  );
}

// Un watch que nadie detiene sigue usando GPS y batería.
export function stopWatch() {
  if (watchId === null) return;

  navigator.geolocation.clearWatch(watchId);
  watchId = null;
}
