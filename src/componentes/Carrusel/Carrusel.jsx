import { useRef } from 'react'
import TarjetaProducto from '../TarjetaProducto/TarjetaProducto'
import estilos from './Carrusel.module.css'

function Carrusel({ titulo, items }) {
  const contenedorRef = useRef(null)

  const desplazar = (direccion) => {
    const contenedor = contenedorRef.current
    if (!contenedor) return
    const ancho = 280 + 20
    contenedor.scrollBy({ left: direccion * ancho * 2, behavior: 'smooth' })
  }

  return (
    <section className={estilos.seccion}>
      <div className={estilos.cabecera}>
        <h2 className={estilos.titulo}>{titulo}</h2>
        <div className={estilos.botones}>
          <button
            type="button"
            className={estilos.boton}
            onClick={() => desplazar(-1)}
            aria-label="Anterior"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            className={estilos.boton}
            onClick={() => desplazar(1)}
            aria-label="Siguiente"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>
      <div ref={contenedorRef} className={estilos.contenedor} role="list">
        {items.map((item) => (
          <div key={item.id} className={estilos.item} role="listitem">
            <TarjetaProducto producto={item} />
          </div>
        ))}
      </div>
    </section>
  )
}

export default Carrusel
