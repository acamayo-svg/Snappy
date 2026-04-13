import estilos from './BarraBusquedaProductos.module.css'

const MODOS = [
  { valor: 'todo', etiqueta: 'Todo' },
  { valor: 'nombre', etiqueta: 'Nombre' },
  { valor: 'descripcion', etiqueta: 'Descripción' },
  { valor: 'categoria', etiqueta: 'Categoría' },
]

function BarraBusquedaProductos({ valor, onValorChange, modo, onModoChange, placeholder }) {
  return (
    <div className={estilos.contenedor}>
      <label className={estilos.etiqueta} htmlFor="snappy-busqueda-productos">
        Buscar productos
      </label>
      <div className={estilos.fila}>
        <input
          id="snappy-busqueda-productos"
          type="search"
          className={estilos.input}
          value={valor}
          onChange={(e) => onValorChange(e.target.value)}
          placeholder={placeholder ?? 'Ej. pizza, café, farmacia…'}
          autoComplete="off"
        />
        <select
          className={estilos.select}
          value={modo}
          onChange={(e) => onModoChange(e.target.value)}
          aria-label="Criterio de búsqueda"
        >
          {MODOS.map((m) => (
            <option key={m.valor} value={m.valor}>
              {m.etiqueta}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export default BarraBusquedaProductos
