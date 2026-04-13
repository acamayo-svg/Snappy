/**
 * Strategy: cada estrategia aplica un criterio sobre la lista de productos.
 * MotorBusquedaProductos (contexto) encadena las estrategias en orden (AND lógico).
 */

/** @typedef {{ texto?: string, categoria?: string, precioMin?: number | null, precioMax?: number | null }} CriteriosBusquedaProducto */

export class EstrategiaFiltroNombre {
  /** @param {unknown[]} productos @param {CriteriosBusquedaProducto} criterios */
  aplicar(productos, criterios) {
    const q = (criterios.texto ?? '').trim().toLowerCase()
    if (!q) return productos
    return productos.filter((p) => {
      const nombre = String(p?.nombre ?? '').toLowerCase()
      const desc = String(p?.descripcion ?? '').toLowerCase()
      return nombre.includes(q) || desc.includes(q)
    })
  }
}

/** Categoría = tipo de establecimiento (`tipo_nombre` / `tipo_clave` del API). */
export class EstrategiaFiltroCategoria {
  aplicar(productos, criterios) {
    const cat = (criterios.categoria ?? '').trim()
    if (!cat) return productos
    const catLower = cat.toLowerCase()
    return productos.filter((p) => {
      const tn = String(p?.tipo_nombre ?? '').trim().toLowerCase()
      const tc = String(p?.tipo_clave ?? '').trim().toLowerCase()
      return tn === catLower || tc === catLower
    })
  }
}

export class EstrategiaFiltroPrecio {
  aplicar(productos, criterios) {
    const min = criterios.precioMin
    const max = criterios.precioMax
    return productos.filter((p) => {
      const precio = Number(p?.precio)
      const n = Number.isFinite(precio) ? precio : 0
      if (min != null && Number.isFinite(min) && n < min) return false
      if (max != null && Number.isFinite(max) && n > max) return false
      return true
    })
  }
}

export class MotorBusquedaProductos {
  /** @param {{ aplicar: (productos: unknown[], c: CriteriosBusquedaProducto) => unknown[] }[]} estrategias */
  constructor(estrategias) {
    this.estrategias = estrategias
  }

  ejecutar(productos, criterios) {
    return this.estrategias.reduce(
      (lista, estrategia) => estrategia.aplicar(lista, criterios),
      productos
    )
  }
}

const motorPorDefecto = new MotorBusquedaProductos([
  new EstrategiaFiltroNombre(),
  new EstrategiaFiltroCategoria(),
  new EstrategiaFiltroPrecio(),
])

export function filtrarProductos(productos, criterios) {
  const lista = Array.isArray(productos) ? [...productos] : []
  return motorPorDefecto.ejecutar(lista, criterios ?? {})
}

/** Nombres únicos de categoría (tipo de negocio) ordenados. */
export function listarCategoriasDesdeProductos(productos) {
  const mapa = new Map()
  for (const p of productos || []) {
    const n = String(p?.tipo_nombre ?? '').trim()
    if (n) mapa.set(n.toLowerCase(), n)
  }
  return [...mapa.values()].sort((a, b) => a.localeCompare(b, 'es'))
}
