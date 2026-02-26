/**
 * Singleton del carrito de compras.
 * Única instancia en toda la app; se encarga exclusivamente de mantener
 * el estado del carrito y notificar a los suscriptores cuando cambie.
 */
class CarritoSingleton {
  static #instance = null
  #items = []
  #listeners = new Set()

  static getInstance() {
    if (CarritoSingleton.#instance === null) {
      CarritoSingleton.#instance = new CarritoSingleton()
    }
    return CarritoSingleton.#instance
  }

  constructor() {
    if (CarritoSingleton.#instance !== null) {
      throw new Error('CarritoSingleton: usar getInstance() en lugar de new.')
    }
  }

  #notify() {
    this.#listeners.forEach((fn) => fn())
  }

  /**
   * Suscribe un callback que se ejecuta cuando el carrito cambia.
   * @param {() => void} callback
   * @returns {() => void} función para cancelar la suscripción
   */
  subscribe(callback) {
    this.#listeners.add(callback)
    return () => this.#listeners.delete(callback)
  }

  getItems() {
    return [...this.#items]
  }

  agregar(producto) {
    const existente = this.#items.find((i) => i.id === producto.id)
    if (existente) {
      this.#items = this.#items.map((i) =>
        i.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i
      )
    } else {
      this.#items = [
        ...this.#items,
        {
          id: producto.id,
          nombre: producto.nombre,
          precio: producto.precio,
          imagen: producto.imagen ?? null,
          establecimiento: producto.establecimiento ?? null,
          cantidad: 1,
        },
      ]
    }
    this.#notify()
  }

  quitar(id) {
    this.#items = this.#items.filter((i) => i.id !== id)
    this.#notify()
  }

  cambiarCantidad(id, cantidad) {
    this.#items = this.#items
      .map((i) => (i.id === id ? { ...i, cantidad: Math.max(1, cantidad) } : i))
      .filter((i) => i.cantidad > 0)
    this.#notify()
  }

  vaciar() {
    this.#items = []
    this.#notify()
  }

  getTotalItems() {
    return this.#items.reduce((acc, item) => acc + item.cantidad, 0)
  }

  getTotal() {
    return this.#items.reduce((acc, item) => acc + item.cantidad * (item.precio || 0), 0)
  }
}

const carrito = CarritoSingleton.getInstance()
export { CarritoSingleton, carrito }
export default carrito
