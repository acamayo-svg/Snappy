import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contextos/ContextoAuth'
import Carrusel from '../../componentes/Carrusel/Carrusel'
import BarraBusquedaProductos from '../../componentes/BarraBusquedaProductos/BarraBusquedaProductos'
import { listarProductosApi } from '../../servicios/servicioProductos'
import { productosEjemplo } from '../../datos/productos-ejemplo'
import { crearBuscadorProductos } from '../../logica/busqueda'
import estilos from './PaginaPrincipal.module.css'

function PaginaPrincipal() {
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [terminoBusqueda, setTerminoBusqueda] = useState('')
  const [modoBusqueda, setModoBusqueda] = useState('todo')
  const { estaAutenticado } = useAuth()

  const buscador = useMemo(() => crearBuscadorProductos(modoBusqueda), [modoBusqueda])

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

  const itemsBase = productos.length > 0 ? productos : productosEjemplo
  const items = useMemo(
    () => buscador.ejecutar(itemsBase, terminoBusqueda),
    [buscador, itemsBase, terminoBusqueda]
  )

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
        <BarraBusquedaProductos
          valor={terminoBusqueda}
          onValorChange={setTerminoBusqueda}
          modo={modoBusqueda}
          onModoChange={setModoBusqueda}
        />
        {cargando ? (
          <p className={estilos.mensajeCarga}>Cargando productos…</p>
        ) : null}
        <Carrusel titulo="Ofertas destacadas" items={items} />
        <Carrusel titulo="Cerca de ti" items={[...items].reverse()} />
      </div>
    </div>
  )
}

export default PaginaPrincipal
