/**
 * Normaliza texto para comparaciones insensibles a mayúsculas y tildes.
 */
export function normalizarTextoBusqueda(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
}
