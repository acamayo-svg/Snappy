import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contextos/ContextoAuth'
import Carrusel from '../../componentes/Carrusel/Carrusel'
import { listarProductosApi } from '../../servicios/servicioProductos'
import { productosEjemplo } from '../../datos/productos-ejemplo'
import estilos from './PaginaPrincipal.module.css'

function PaginaPrincipal() {
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const { estaAutenticado } = useAuth()

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
      <section className={estilos.hero}>
        <div className={estilos.heroContenido}>
          <h1 className={estilos.heroTitulo}>
            Todo lo que necesitas, <span className={estilos.heroDestacado}>a domicilio</span>
          </h1>
          <p className={estilos.heroTexto}>
            Comida, farmacia, supermercado y más. Entregas rápidas para tu día a día.
          </p>
          {!estaAutenticado && (
            <div className={estilos.heroAcciones}>
              <Link to="/establecimiento" className={estilos.botonSecundario}>
                Tengo un establecimiento
              </Link>
              <Link to="/domiciliario" className={estilos.botonTerciario}>
                Quiero ser domiciliario
              </Link>
            </div>
          )}
        </div>
      </section>
      <div className={estilos.contenido}>
        <Carrusel titulo="Ofertas destacadas" items={items} />
        <Carrusel titulo="Cerca de ti" items={[...items].reverse()} />
      </div>
    </div>
  )
}

export default PaginaPrincipal
