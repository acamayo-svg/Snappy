import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contextos/ContextoAuth'
import { useCarrito } from '../../contextos/ContextoCarrito'
import { crearPreferenciaPagoApi } from '../../servicios/servicioPagos'
import estilos from './BarraMenu.module.css'

const rutas = [
  { path: '/', etiqueta: 'Inicio' },
  { path: '/cliente', etiqueta: 'Cliente', rol: 'cliente' },
  { path: '/establecimiento', etiqueta: 'Establecimiento', rol: 'establecimiento' },
  { path: '/domiciliario', etiqueta: 'Domiciliario', rol: 'domiciliario' },
]

function BarraMenu() {
  const ubicacion = useLocation()
  const navegar = useNavigate()
  const { usuario, cerrarSesion, cambiarRolActivo, cargando } = useAuth()
  const [menuRolesAbierto, setMenuRolesAbierto] = useState(false)
  const [carritoAbierto, setCarritoAbierto] = useState(false)
  const [pagando, setPagando] = useState(false)
  const [errorPago, setErrorPago] = useState(null)
  const { totalItems, items, total, quitarDelCarrito, vaciarCarrito } = useCarrito()

  const irAPagar = async () => {
    if (items.length === 0) return
    setErrorPago(null)
    setPagando(true)
    try {
      const body = items.map((item) => ({
        title: item.nombre,
        quantity: item.cantidad,
        unit_price: item.precio || 0,
      }))
      const { url } = await crearPreferenciaPagoApi(body)
      if (url) window.location.href = url
      else setErrorPago('No se obtuvo la URL de pago.')
    } catch (e) {
      setErrorPago(e?.message ?? 'Error al iniciar el pago.')
    } finally {
      setPagando(false)
    }
  }

  return (
    <header className={estilos.contenedor}>
      <Link to="/" className={estilos.logo} title="Snappy">
        <span className={estilos.iconoLogo}>
          <img src="/recursos/logo.png" alt="" className={estilos.imagenLogo} aria-hidden="true" />
        </span>
      </Link>
      <nav className={estilos.navegacion}>
        {rutas
          .filter(({ rol }) => {
            // Sin sesión: mostramos todas las rutas públicas (Inicio, Cliente, Establecimiento, Domiciliario)
            if (!usuario) return true
            // Con sesión: solo mostramos rutas sin rol (por ahora solo Inicio);
            // la navegación por roles se hace con el selector de rol.
            return !rol
          })
          .map(({ path, etiqueta }) => (
          <Link
            key={path}
            to={path}
            className={path === ubicacion.pathname ? estilos.enlaceActivo : estilos.enlace}
          >
            {etiqueta}
          </Link>
        ))}
        <button
          type="button"
          className={estilos.botonCarritoIcono}
          onClick={() => setCarritoAbierto(true)}
          aria-label="Ver carrito"
        >
          <span className={estilos.iconoCarritoSvg} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path
                d="M6 6h15l-1.5 9h-12z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="10" cy="19" r="1.3" />
              <circle cx="17" cy="19" r="1.3" />
            </svg>
          </span>
          {totalItems > 0 && <span className={estilos.badgeCarrito}>{totalItems}</span>}
        </button>
        {usuario ? (
          <>
            <Link
              to="/cuenta"
              className={ubicacion.pathname === '/cuenta' ? estilos.enlaceActivo : estilos.enlace}
            >
              Mi cuenta
            </Link>
            {usuario.obtenerRoles().length > 1 ? (
              <div className={estilos.conmutadorRol}>
                <button
                  type="button"
                  className={estilos.botonRol}
                  onClick={() => setMenuRolesAbierto((abierto) => !abierto)}
                  disabled={cargando}
                  aria-haspopup="menu"
                  aria-expanded={menuRolesAbierto}
                >
                  <span className={estilos.botonRolEtiqueta}>{usuario.obtenerEtiquetaRol()}</span>
                  <span className={estilos.botonRolIcono} aria-hidden="true">
                    <svg viewBox="0 0 16 16">
                      <path
                        d="M4.5 6l3.5 4 3.5-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </button>
                {menuRolesAbierto && (
                  <div className={estilos.menuRol} role="menu">
                    {usuario.obtenerRoles().map((r) => {
                      const etiqueta =
                        r === 'cliente' ? 'Cliente' : r === 'establecimiento' ? 'Establecimiento' : 'Domiciliario'
                      const ruta =
                        r === 'cliente' ? '/cliente' : r === 'establecimiento' ? '/establecimiento' : '/domiciliario'

                      const esActivo = r === usuario.rolActivo

                      return (
                        <button
                          key={r}
                          type="button"
                          role="menuitem"
                          className={
                            esActivo
                              ? `${estilos.menuRolOpcion} ${estilos.menuRolOpcionActiva}`
                              : estilos.menuRolOpcion
                          }
                          onClick={() => {
                            setMenuRolesAbierto(false)
                            if (!esActivo) {
                              cambiarRolActivo(r)
                            }
                            navegar(ruta, { replace: true })
                          }}
                        >
                          {etiqueta}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : (
              <span className={estilos.rol}>{usuario.obtenerEtiquetaRol()}</span>
            )}
            <button
              type="button"
              onClick={cerrarSesion}
              className={estilos.botonCerrar}
              disabled={cargando}
            >
              Cerrar sesión
            </button>
          </>
        ) : (
          <Link to="/login" className={estilos.enlaceLogin}>
            Iniciar sesión
          </Link>
        )}
      </nav>
      {carritoAbierto && (
        <aside className={estilos.panelCarrito} aria-label="Carrito de compras">
          <div className={estilos.panelCarritoHeader}>
            <h2 className={estilos.panelCarritoTitulo}>Tu carrito</h2>
            <button
              type="button"
              className={estilos.panelCarritoCerrar}
              onClick={() => setCarritoAbierto(false)}
            >
              ×
            </button>
          </div>
          <div className={estilos.panelCarritoContenido}>
            {items.length === 0 ? (
              <p className={estilos.panelCarritoVacio}>Aún no has añadido productos.</p>
            ) : (
              <ul className={estilos.panelCarritoLista}>
                {items.map((item) => (
                  <li key={item.id} className={estilos.panelCarritoItem}>
                    <div className={estilos.panelCarritoInfo}>
                      <span className={estilos.panelCarritoNombre}>{item.nombre}</span>
                      <span className={estilos.panelCarritoCantidad}>x{item.cantidad}</span>
                    </div>
                    <button
                      type="button"
                      className={estilos.panelCarritoQuitar}
                      onClick={() => quitarDelCarrito(item.id)}
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {errorPago && (
              <p className={estilos.panelCarritoError} role="alert">
                {errorPago}
              </p>
            )}
          <div className={estilos.panelCarritoFooter}>
            <div className={estilos.panelCarritoTotal}>
              <span>Total estimado</span>
              <strong>
                {new Intl.NumberFormat('es-CO', {
                  style: 'currency',
                  currency: 'COP',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
                }).format(total)}
              </strong>
            </div>
            <div className={estilos.panelCarritoAcciones}>
              <button
                type="button"
                className={estilos.panelCarritoVaciar}
                onClick={vaciarCarrito}
                disabled={items.length === 0}
              >
                Vaciar
              </button>
              <button
                type="button"
                className={estilos.panelCarritoPagar}
                disabled={items.length === 0 || pagando}
                onClick={irAPagar}
              >
                {pagando ? 'Redirigiendo…' : 'Ir a pagar'}
              </button>
            </div>
          </div>
        </aside>
      )}
    </header>
  )
}

export default BarraMenu
