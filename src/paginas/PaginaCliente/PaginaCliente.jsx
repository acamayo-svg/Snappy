import { useState, useEffect } from 'react'
import Carrusel from '../../componentes/Carrusel/Carrusel'
import { listarProductosApi } from '../../servicios/servicioProductos'
import { productosEjemplo } from '../../datos/productos-ejemplo'
import estilos from './PaginaCliente.module.css'

function PaginaCliente() {
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let cancel = false
    listarProductosApi()
      .then((data) => {
        if (!cancel && Array.isArray(data)) setProductos(data)
      })
      .catch(() => {
        if (!cancel) setProductos([])
      })
      .finally(() => {
        if (!cancel) setCargando(false)
      })
    return () => { cancel = true }
  }, [])

  const items = productos.length > 0 ? productos : productosEjemplo

  return (
    <div className={estilos.contenedor}>
      <section className={estilos.banner}>
        <div className={estilos.bannerContenido}>
          <h1 className={estilos.titulo}>Pedidos a tu puerta</h1>
          <p className={estilos.subtitulo}>
            Explora tiendas, elige productos y recibe en casa. Rápido y seguro.
          </p>
          <div className={estilos.acciones}>
            <span className={estilos.badge}>Cliente</span>
          </div>
        </div>
      </section>
      <div className={estilos.contenido}>
        <Carrusel titulo="Para ti" items={items} />
        <Carrusel titulo="Recomendados" items={items.length > 4 ? items.slice(0, 4) : [...items].reverse()} />
      </div>
    </div>
  )
}

export default PaginaCliente
