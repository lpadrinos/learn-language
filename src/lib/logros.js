export const LOGROS = [
  { id: 'primer_punto', titulo: 'Primeros pasos', desc: 'Gana tus primeros puntos', condicion: (pts) => pts >= 1 },
  { id: 'cincuenta_puntos', titulo: 'En racha', desc: 'Acumula 50 puntos', condicion: (pts) => pts >= 50 },
  { id: 'cien_puntos', titulo: 'Experto', desc: 'Acumula 100 puntos', condicion: (pts) => pts >= 100 },
  { id: 'doscientos_puntos', titulo: 'Maestro', desc: 'Acumula 200 puntos', condicion: (pts) => pts >= 200 },
]

export function verificarLogros(puntosTotales, logrosActuales = []) {
  return LOGROS.filter(l => !logrosActuales.includes(l.id) && l.condicion(puntosTotales))
}
