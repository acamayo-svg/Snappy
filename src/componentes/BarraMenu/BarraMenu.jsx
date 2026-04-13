import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contextos/ContextoAuth'
import { useCarrito } from '../../contextos/ContextoCarrito'
import { prepararPagoWompiApi } from '../../servicios/servicioPagos'
import estilos from './BarraMenu.module.css'

const REF_WOMPI_STORAGE = 'snappy_wompi_ref'

function cargarScriptWompi() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Sin ventana'))
  if (window.WidgetCheckout) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://checkout.wompi.co/widget.js'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('No se pudo cargar el script de Wompi'))
    document.body.appendChild(s)
  })
}

const rutas = [
  { path: '/', etiqueta: 'Inicio' },
  { path: '/cliente', etiqueta: 'Cliente', rol: 'cliente' },
  { path: '/establecimiento', etiqueta: 'Establecimiento', rol: 'establecimiento' },
  { path: '/domiciliario', etiqueta: 'Domiciliario', rol: 'domiciliario' },
]

function BarraMenu() {
  const ubicacion = useLocation()
  const navegar = useNavigate()
  const { usuario, cerrarSesion, cambiarRolActivo, cargando, refrescarCuenta } = useAuth()
  const [menuRolesAbierto, setMenuRolesAbierto] = useState(false)
  const [carritoAbierto, setCarritoAbierto] = useState(false)
  const [animarCarrito, setAnimarCarrito] = useState(false)
  const { totalItems, items, total, quitarDelCarrito, vaciarCarrito } = useCarrito()
  const [pagando, setPagando] = useState(false)
  const [mensajePago, setMensajePago] = useState(null)
  const [modalEnvio, setModalEnvio] = useState(false)
  const [envDir, setEnvDir] = useState('')
  const [envTel, setEnvTel] = useState('')
  const [envNota, setEnvNota] = useState('')
  const [guardarEnvioPerfil, setGuardarEnvioPerfil] = useState(true)

  useEffect(() => {
    if (totalItems > 0) {
      setAnimarCarrito(true)
      const id = setTimeout(() => setAnimarCarrito(false), 600)
      return () => clearTimeout(id)
    }
  }, [totalItems])

  useEffect(() => {
    if (!modalEnvio || !usuario) return
    setEnvDir(String(usuario.envio?.direccion ?? ''))
    setEnvTel(String(usuario.envio?.telefono ?? ''))
    setEnvNota(String(usuario.envio?.nota ?? ''))
  }, [modalEnvio, usuario])

  async function abrirWompiConPayload(payload, opcionesPreparar = {}) {
    const datos = await prepararPagoWompiApi(payload, opcionesPreparar)
    await cargarScriptWompi()

    sessionStorage.setItem(REF_WOMPI_STORAGE, datos.reference)

    const checkout = new window.WidgetCheckout({
      currency: datos.currency,
      amountInCents: datos.amountInCents,
      reference: datos.reference,
      publicKey: datos.publicKey,
      signature: { integrity: datos.signatureIntegrity },
      redirectUrl: datos.redirectUrl,
    })

    checkout.open(() => {
      setCarritoAbierto(false)
    })
  }

  async function irAPagarWompi() {
    setMensajePago(null)
    if (!usuario) {
      navegar('/login', { state: { desde: ubicacion.pathname } })
      return
    }
    if (items.length === 0) return

    const sinTienda = items.some((i) => !i.establecimiento_id)
    if (sinTienda) {
      setMensajePago('Los productos del catálogo de ejemplo no se pueden pagar. Elige artículos reales de un establecimiento.')
      return
    }
    const tiendas = new Set(items.map((i) => i.establecimiento_id))
    if (tiendas.size > 1) {
      setMensajePago('Paga un solo establecimiento por pedido. Vaciá el carrito o quitá productos de otra tienda.')
      return
    }

    setPagando(true)
    let cuenta = usuario
    try {
      const actualizado = await refrescarCuenta()
      if (actualizado) cuenta = actualizado
    } catch {
      // seguimos con datos locales si falla
    }

    if (!cuenta?.tieneEnvioCompleto?.()) {
      setModalEnvio(true)
      setPagando(false)
      return
    }

    try {
      const payload = items.map((i) => ({ id: i.id, cantidad: i.cantidad }))
      await abrirWompiConPayload(payload, {})
    } catch (e) {
      setMensajePago(e?.message ?? 'No se pudo iniciar Wompi')
    } finally {
      setPagando(false)
    }
  }

  async function confirmarEnvioYPagar(e) {
    e.preventDefault()
    setMensajePago(null)
    const dir = envDir.trim()
    const tel = envTel.trim()
    if (!dir || !tel) {
      setMensajePago('Dirección y teléfono son obligatorios para el envío.')
      return
    }
    setPagando(true)
    try {
      const payload = items.map((i) => ({ id: i.id, cantidad: i.cantidad }))
      await abrirWompiConPayload(payload, {
        envio: { direccion: dir, telefono: tel, nota: envNota.trim() },
        guardar_envio_en_perfil: guardarEnvioPerfil,
      })
      setModalEnvio(false)
      await refrescarCuenta()
    } catch (err) {
      setMensajePago(err?.message ?? 'No se pudo iniciar Wompi')
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
            if (!usuario) return true
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
          className={`${estilos.botonCarritoIcono} ${
            animarCarrito ? estilos.botonCarritoAgitado : ''
          }`}
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
      {modalEnvio && (
        <div
          className={estilos.modalEnvioOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-envio-pago"
        >
          <div className={estilos.modalEnvio}>
            <h2 id="titulo-envio-pago" className={estilos.modalEnvioTitulo}>
              Datos de envío
            </h2>
            <p className={estilos.modalEnvioTexto}>
              Necesitamos dirección y teléfono para el domicilio. También puedes guardarlos en{' '}
              <Link to="/cuenta" className={estilos.modalEnvioEnlace} onClick={() => setModalEnvio(false)}>
                Mi cuenta
              </Link>
              .
            </p>
            <form onSubmit={confirmarEnvioYPagar} className={estilos.modalEnvioForm}>
              <label className={estilos.modalEnvioEtiqueta}>
                Dirección
                <input
                  className={estilos.modalEnvioInput}
                  value={envDir}
                  onChange={(ev) => setEnvDir(ev.target.value)}
                  required
                  autoComplete="street-address"
                />
              </label>
              <label className={estilos.modalEnvioEtiqueta}>
                Teléfono de contacto
                <input
                  className={estilos.modalEnvioInput}
                  value={envTel}
                  onChange={(ev) => setEnvTel(ev.target.value)}
                  required
                  autoComplete="tel"
                />
              </label>
              <label className={estilos.modalEnvioEtiqueta}>
                Nota para el repartidor (opcional)
                <textarea
                  className={estilos.modalEnvioTextarea}
                  value={envNota}
                  onChange={(ev) => setEnvNota(ev.target.value)}
                  rows={2}
                  placeholder="Torre, portería, referencias…"
                />
              </label>
              <label className={estilos.modalEnvioCheck}>
                <input
                  type="checkbox"
                  checked={guardarEnvioPerfil}
                  onChange={(ev) => setGuardarEnvioPerfil(ev.target.checked)}
                />
                Guardar en mi perfil para próximas compras
              </label>
              {mensajePago && (
                <p className={estilos.modalEnvioError} role="alert">
                  {mensajePago}
                </p>
              )}
              <div className={estilos.modalEnvioBotones}>
                <button
                  type="button"
                  className={estilos.modalEnvioSecundario}
                  onClick={() => {
                    setModalEnvio(false)
                    setMensajePago(null)
                  }}
                  disabled={pagando}
                >
                  Cancelar
                </button>
                <button type="submit" className={estilos.modalEnvioPrimario} disabled={pagando}>
                  {pagando ? 'Conectando…' : 'Continuar y pagar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
              {mensajePago && !modalEnvio && (
                <p className={estilos.panelCarritoAviso} role="alert">
                  {mensajePago}
                </p>
              )}
              <div className={estilos.panelCarritoFilaBotones}>
                <button
                  type="button"
                  className={estilos.panelCarritoPagar}
                  onClick={irAPagarWompi}
                  disabled={items.length === 0 || pagando}
                >
                  {pagando ? 'Conectando…' : 'Pagar con Wompi'}
                </button>
                <button
                  type="button"
                  className={estilos.panelCarritoVaciar}
                  onClick={vaciarCarrito}
                  disabled={items.length === 0}
                >
                  Vaciar
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}
    </header>
  )
}

export default BarraMenu
