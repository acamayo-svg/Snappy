import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { carrito } from '../logica/carrito/CarritoSingleton'

const ContextoCarrito = createContext(null)

export function ProveedorCarrito({ children }) {
  const [items, setItems] = useState(() => carrito.getItems())

  useEffect(() => {
    return carrito.subscribe(() => setItems(carrito.getItems()))
  }, [])

  const agregarAlCarrito = useCallback((producto) => {
    carrito.agregar(producto)
  }, [])

  const quitarDelCarrito = useCallback((id) => {
    carrito.quitar(id)
  }, [])

  const cambiarCantidad = useCallback((id, cantidad) => {
    carrito.cambiarCantidad(id, cantidad)
  }, [])

  const vaciarCarrito = useCallback(() => {
    carrito.vaciar()
  }, [])

  const totalItems = carrito.getTotalItems()
  const total = carrito.getTotal()

  const valor = {
    items,
    totalItems,
    total,
    agregarAlCarrito,
    quitarDelCarrito,
    cambiarCantidad,
    vaciarCarrito,
  }

  return <ContextoCarrito.Provider value={valor}>{children}</ContextoCarrito.Provider>
}

export function useCarrito() {
  const ctx = useContext(ContextoCarrito)
  if (!ctx) throw new Error('useCarrito debe usarse dentro de ProveedorCarrito')
  return ctx
}
