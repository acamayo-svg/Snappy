import { useCarrito } from '../../contextos/ContextoCarrito'
import estilos from './TarjetaProducto.module.css'

const IMAGEN_PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"%3E%3Crect fill="%23f1f3f4" width="120" height="120"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-size="14"%3E%3F%3C/text%3E%3C/svg%3E'

function TarjetaProducto({ producto }) {
  const { agregarAlCarrito } = useCarrito()
  const precioFormateado =
    producto.precio > 0
      ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(producto.precio)
      : 'Ver precios'
  const categoria = producto.categoria ?? producto.tipo_nombre ?? ''

  return (
    <article className={estilos.contenedor}>
      <div className={estilos.imagenContenedor}>
        <img
          src={producto.imagen || IMAGEN_PLACEHOLDER}
          alt={producto.nombre}
          className={estilos.imagen}
          onError={(e) => {
            e.target.src = IMAGEN_PLACEHOLDER
          }}
        />
        {categoria && <span className={estilos.categoria}>{categoria}</span>}
      </div>
      <div className={estilos.cuerpo}>
        <h3 className={estilos.nombre}>{producto.nombre}</h3>
        <p className={estilos.descripcion}>{producto.descripcion}</p>
        <p className={estilos.establecimiento}>{producto.establecimiento}</p>
        <div className={estilos.filaInferior}>
          <p className={estilos.precio}>{precioFormateado}</p>
          <button
            type="button"
            className={estilos.botonCarrito}
            onClick={() => agregarAlCarrito(producto)}
          >
            Añadir al carrito
          </button>
        </div>
      </div>
    </article>
  )
}

export default TarjetaProducto
