/**
 * Sincroniza criterios de búsqueda con la URL (shareable / historial).
 */

/** @param {URLSearchParams} searchParams */
export function criteriosDesdeSearchParams(searchParams) {
  const q = searchParams.get('q') || ''
  const cat = searchParams.get('cat') || ''
  const minRaw = searchParams.get('min')
  const maxRaw = searchParams.get('max')
  const precioMin = minRaw != null && minRaw !== '' ? Number(minRaw) : null
  const precioMax = maxRaw != null && maxRaw !== '' ? Number(maxRaw) : null
  return {
    texto: q,
    categoria: cat,
    precioMin: Number.isFinite(precioMin) ? precioMin : null,
    precioMax: Number.isFinite(precioMax) ? precioMax : null,
  }
}

export function searchParamsDesdeCriterios(criterios) {
  const p = new URLSearchParams()
  const texto = (criterios.texto ?? '').trim()
  const cat = (criterios.categoria ?? '').trim()
  if (texto) p.set('q', texto)
  if (cat) p.set('cat', cat)
  if (criterios.precioMin != null && Number.isFinite(criterios.precioMin)) {
    p.set('min', String(Math.max(0, Math.round(criterios.precioMin))))
  }
  if (criterios.precioMax != null && Number.isFinite(criterios.precioMax)) {
    p.set('max', String(Math.max(0, Math.round(criterios.precioMax))))
  }
  return p
}
