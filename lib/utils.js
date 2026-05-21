// lib/utils.js

/** Parsea string "Martillo:2,Destornillador:5" a array de objetos */
export function parseItems(str) {
  if (!str) return [];
  return str.split(',').map((part) => {
    const [nombre, cantidad] = part.split(':');
    return { nombre: nombre?.trim() || '', cantidad: parseInt(cantidad, 10) || 0 };
  });
}

/** Serializa array de {nombre, cantidad} a "Martillo:2,Destornillador:5" */
export function serializeItems(items) {
  return items.map((i) => `${i.nombre}:${i.cantidad}`).join(',');
}

/** Calcula diferencia entre ítems egresados e ingresados */
export function calcDiferencia(egresados, ingresados) {
  const eMap = {};
  parseItems(egresados).forEach(({ nombre, cantidad }) => { eMap[nombre] = cantidad; });
  const diffs = [];
  parseItems(ingresados).forEach(({ nombre, cantidad }) => {
    const egr = eMap[nombre] || 0;
    const diff = egr - cantidad;
    if (diff !== 0) diffs.push(`${nombre}:${diff}`);
  });
  // Ítems egresados que no fueron ingresados
  Object.entries(eMap).forEach(([nombre, cantidad]) => {
    if (!parseItems(ingresados).find((i) => i.nombre === nombre)) {
      diffs.push(`${nombre}:${cantidad}`);
    }
  });
  return diffs.join(',');
}

export function clsx(...classes) {
  return classes.filter(Boolean).join(' ');
}

/** Humaniza diferencia de tiempo desde una fecha/hora string. Opcionalmente hasta horaFinStr */
export function tiempoTranscurrido(fechaStr, horaStr, horaFinStr = null) {
  if (!fechaStr || !horaStr) return '-';
  // fecha: DD/MM/YYYY, hora: HH:MM
  const [d, m, y] = fechaStr.split('/').map(Number);
  const [h, min] = horaStr.split(':').map(Number);
  const from = new Date(y, m - 1, d, h, min);
  
  let toTime = Date.now();
  if (horaFinStr) {
    const [hFin, minFin] = horaFinStr.split(':').map(Number);
    toTime = new Date(y, m - 1, d, hFin, minFin).getTime();
    // Si la hora de fin es menor a la de inicio, asumimos que cruzó la medianoche
    if (toTime < from.getTime()) {
      toTime += 24 * 3600000;
    }
  }

  const diffMs = toTime - from.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  const diffM = Math.floor((diffMs % 3600000) / 60000);
  if (diffH >= 24) return `${Math.floor(diffH / 24)}d ${diffH % 24}h`;
  if (diffH > 0) return `${diffH}h ${diffM}m`;
  return `${diffM}m`;
}

export function minutosTranscurridos(fechaStr, horaStr, horaFinStr = null) {
  if (!fechaStr || !horaStr) return 0;
  const [d, m, y] = fechaStr.split('/').map(Number);
  const [h, min] = horaStr.split(':').map(Number);
  const from = new Date(y, m - 1, d, h, min);

  let toTime = Date.now();
  if (horaFinStr) {
    const [hFin, minFin] = horaFinStr.split(':').map(Number);
    toTime = new Date(y, m - 1, d, hFin, minFin).getTime();
    if (toTime < from.getTime()) {
      toTime += 24 * 3600000;
    }
  }
  
  return Math.floor((toTime - from.getTime()) / 60000);
}

// ─── Helpers de fecha/hora y utilidades ──────────────────────────────────────

export function nowAR() {
  return new Date();
}

export function formatDate(d) {
  return d.toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

export function formatTime(d) {
  return d.toLocaleTimeString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

/** Genera un ID único compatible con el sistema viejo y nuevo */
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export function toUpperKeys(obj) {
  if (!obj) return obj;
  const newObj = {};
  for (const [key, value] of Object.entries(obj)) {
    newObj[key.toUpperCase()] = value;
  }
  return newObj;
}

export function mapToUpper(arr) {
  if (!arr) return [];
  return arr.map(toUpperKeys);
}
