import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import TarjetaProducto from '../../componentes/TarjetaProducto/TarjetaProducto'
import { listarProductosApi } from '../../servicios/servicioProductos'
import {
  filtrarProductos,
  listarCategoriasDesdeProductos,
} from '../../logica/busqueda/estrategiasBusquedaProductos'
import {
  criteriosDesdeSearchParams,
  searchParamsDesdeCriterios,
} from '../../logica/busqueda/paramBusqueda'
import estilos from './PaginaBusqueda.module.css'

function PaginaBusqueda() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)

  const [form, setForm] = useState(() => criteriosDesdeSearchParams(searchParams))

  useEffect(() => {
    setForm(criteriosDesdeSearchParams(searchParams))
  }, [searchParams])

  useEffect(() => {
    let cancel = false
    setCargando(true)
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

  const categorias = useMemo(() => listarCategoriasDesdeProductos(productos), [productos])

  const resultados = useMemo(
    () => filtrarProductos(productos, form),
    [productos, form]
  )

  function aplicarFiltrosALaUrl(e) {
    e?.preventDefault?.()
    const p = searchParamsDesdeCriterios(form)
    setSearchParams(p, { replace: true })
  }

  function limpiarFiltros() {
    const limpio = { texto: '', categoria: '', precioMin: null, precioMax: null }
    setForm(limpio)
    setSearchParams({}, { replace: true })
  }

  return (
    <div className={estilos.contenedor}>
      <h1 className={estilos.titulo}>Buscar productos</h1>
      <p className={estilos.subtitulo}>
        Filtros por nombre o descripción, categoría (tipo de tienda) y rango de precio en pesos COP.
        Los resultados se actualizan al cambiar los valores; puedes fijarlos en la URL con «Aplicar a la
        dirección».
      </p>

      <form className={estilos.panelFiltros} onSubmit={aplicarFiltrosALaUrl}>
        <div className={`${estilos.campo} ${estilos.campoAncho}`}>
          <label className={estilos.etiqueta} htmlFor="busq-texto">
            Nombre o descripción
          </label>
          <input
            id="busq-texto"
            className={estilos.input}
            type="search"
            autoComplete="off"
            placeholder="Ej. pizza, arroz…"
            value={form.texto}
            onChange={(e) => setForm((f) => ({ ...f, texto: e.target.value }))}
          />
        </div>
        <div className={estilos.campo}>
          <label className={estilos.etiqueta} htmlFor="busq-cat">
            Categoría
          </label>
          <select
            id="busq-cat"
            className={estilos.select}
            value={form.categoria}
            onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
          >
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className={estilos.campo}>
          <label className={estilos.etiqueta} htmlFor="busq-min">
            Precio mín. (COP)
          </label>
          <input
            id="busq-min"
            className={estilos.input}
            type="number"
            min={0}
            step={1}
            placeholder="Sin mín."
            value={form.precioMin ?? ''}
            onChange={(e) => {
              const v = e.target.value
              setForm((f) => ({
                ...f,
                precioMin: v === '' ? null : Number(v),
              }))
            }}
          />
        </div>
        <div className={estilos.campo}>
          <label className={estilos.etiqueta} htmlFor="busq-max">
            Precio máx. (COP)
          </label>
          <input
            id="busq-max"
            className={estilos.input}
            type="number"
            min={0}
            step={1}
            placeholder="Sin máx."
            value={form.precioMax ?? ''}
            onChange={(e) => {
              const v = e.target.value
              setForm((f) => ({
                ...f,
                precioMax: v === '' ? null : Number(v),
              }))
            }}
          />
        </div>
        <div className={estilos.botonesFiltro}>
          <button type="submit" className={estilos.botonPrimario}>
            Aplicar a la URL
          </button>
          <button type="button" className={estilos.botonSecundario} onClick={limpiarFiltros}>
            Limpiar
          </button>
        </div>
      </form>

      {cargando ? (
        <p className={estilos.cargando}>Cargando catálogo…</p>
      ) : (
        <>
          <p className={estilos.meta}>
            {resultados.length === productos.length && productos.length > 0
              ? `Mostrando todos los productos (${resultados.length}).`
              : `Mostrando ${resultados.length} de ${productos.length} productos.`}
          </p>
          {resultados.length === 0 ? (
            <p className={estilos.vacio}>No hay productos que coincidan con los filtros.</p>
          ) : (
            <div className={estilos.grilla}>
              {resultados.map((p) => (
                <TarjetaProducto key={p.id} producto={p} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default PaginaBusqueda
