import { normalizarTextoBusqueda } from './normalizarTextoBusqueda.js'

/**
 * Patrón Strategy: cada estrategia define cómo filtrar el catálogo según el término.
 */
export class EstrategiaBusquedaPorNombre {
  filtrar(productos, terminoCrudo) {
    const t = normalizarTextoBusqueda(terminoCrudo)
    if (!t) return productos
    return productos.filter((p) => normalizarTextoBusqueda(p.nombre).includes(t))
  }
}

export class EstrategiaBusquedaPorDescripcion {
  filtrar(productos, terminoCrudo) {
    const t = normalizarTextoBusqueda(terminoCrudo)
    if (!t) return productos
    return productos.filter((p) =>
      normalizarTextoBusqueda(p.descripcion ?? '').includes(t)
    )
  }
}

/** Combina nombre y descripción (OR lógico). */
export class EstrategiaBusquedaNombreYDescripcion {
  constructor() {
    this._porNombre = new EstrategiaBusquedaPorNombre()
    this._porDesc = new EstrategiaBusquedaPorDescripcion()
  }

  filtrar(productos, terminoCrudo) {
    const t = normalizarTextoBusqueda(terminoCrudo)
    if (!t) return productos
    const porNombre = this._porNombre.filtrar(productos, terminoCrudo)
    const porDesc = this._porDesc.filtrar(productos, terminoCrudo)
    const ids = new Set([...porNombre, ...porDesc].map((p) => p.id))
    return productos.filter((p) => ids.has(p.id))
  }
}

export class EstrategiaBusquedaPorCategoria {
  filtrar(productos, terminoCrudo) {
    const t = normalizarTextoBusqueda(terminoCrudo)
    if (!t) return productos
    return productos.filter((p) =>
      normalizarTextoBusqueda(p.categoria ?? '').includes(t)
    )
  }
}

/**
 * Contexto del patrón Strategy: delega el filtrado en la estrategia actual.
 */
export class BuscadorProductos {
  constructor(estrategia) {
    this.estrategia = estrategia
  }

  establecerEstrategia(estrategia) {
    this.estrategia = estrategia
  }

  ejecutar(productos, termino) {
    if (!Array.isArray(productos)) return []
    return this.estrategia.filtrar(productos, termino)
  }
}

const estrategiasPorModo = {
  nombre: () => new EstrategiaBusquedaPorNombre(),
  descripcion: () => new EstrategiaBusquedaPorDescripcion(),
  categoria: () => new EstrategiaBusquedaPorCategoria(),
  todo: () => new EstrategiaBusquedaNombreYDescripcion(),
}

/**
 * @param {'nombre' | 'descripcion' | 'categoria' | 'todo'} modo
 */
export function crearBuscadorProductos(modo = 'todo') {
  const factory = estrategiasPorModo[modo] ?? estrategiasPorModo.todo
  return new BuscadorProductos(factory())
}
