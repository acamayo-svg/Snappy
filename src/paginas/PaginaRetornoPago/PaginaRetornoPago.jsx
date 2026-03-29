import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { obtenerComprobanteApi, sincronizarPagoApi } from '../../servicios/servicioPagos'
import { useCarrito } from '../../contextos/ContextoCarrito'
import estilos from './PaginaRetornoPago.module.css'

/**
 * Páginas de retorno Checkout Pro (/pago/exito, /pago/error, /pago/pendiente).
 * Mercado Pago añade payment_id, status, external_reference, etc. en la query.
 */
function PaginaRetornoPago() {
  const ubicacion = useLocation()
  const [params] = useSearchParams()
  const { vaciarCarrito } = useCarrito()
  const [comprobante, setComprobante] = useState(null)
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(true)

  const esExito = ubicacion.pathname.includes('/pago/exito')
  const esError = ubicacion.pathname.includes('/pago/error')
  const esPendiente = ubicacion.pathname.includes('/pago/pendiente')

  const paymentId = params.get('payment_id') || params.get('collection_id')
  const mpStatus = params.get('status') || params.get('collection_status')
  const externalRef = params.get('external_reference')

  useEffect(() => {
    let cancel = false

    async function cargar() {
      if (esError) {
        setCargando(false)
        return
      }

      if (!externalRef) {
        setCargando(false)
        setError('No se recibió la referencia del pedido. Vuelve al inicio e intenta de nuevo.')
        return
      }

      try {
        if (esExito && paymentId) {
          await sincronizarPagoApi(paymentId, externalRef)
        }
        if (cancel) return
        const comp = await obtenerComprobanteApi(externalRef)
        if (cancel) return
        setComprobante(comp)
        if (esExito && comp?.estado === 'pagado') {
          vaciarCarrito()
        }
      } catch (e) {
        if (!cancel) setError(e?.message ?? 'Error al cargar el comprobante')
      } finally {
        if (!cancel) setCargando(false)
      }
    }

    cargar()
    return () => { cancel = true }
  }, [esError, esExito, paymentId, externalRef, vaciarCarrito])

  const formatear = (n) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(n) || 0)

  if (cargando) {
    return (
      <div className={estilos.contenedor}>
        <p className={estilos.mensaje}>Confirmando tu pago…</p>
      </div>
    )
  }

  if (esError) {
    return (
      <div className={estilos.contenedor}>
        <div className={`${estilos.tarjeta} ${estilos.tarjetaError}`}>
          <h1 className={estilos.titulo}>No se completó el pago</h1>
          <p className={estilos.texto}>
            El pago fue rechazado o cancelado. Puedes intentar de nuevo desde el carrito.
          </p>
          {mpStatus && (
            <p className={estilos.detalle}>
              Estado reportado: <strong>{mpStatus}</strong>
            </p>
          )}
          <Link to="/" className={estilos.enlace}>Volver al inicio</Link>
        </div>
      </div>
    )
  }

  if (esPendiente) {
    return (
      <div className={estilos.contenedor}>
        <div className={`${estilos.tarjeta} ${estilos.tarjetaPendiente}`}>
          <h1 className={estilos.titulo}>Pago pendiente</h1>
          <p className={estilos.texto}>
            Tu pago está en proceso o debes completarlo según el medio elegido. Te avisaremos cuando se acredite.
          </p>
          {comprobante && (
            <p className={estilos.detalle}>
              Pedido <strong>{comprobante.external_reference}</strong> — {comprobante.estado}
            </p>
          )}
          <Link to="/" className={estilos.enlace}>Volver al inicio</Link>
        </div>
      </div>
    )
  }

  if (error && !comprobante) {
    return (
      <div className={estilos.contenedor}>
        <div className={`${estilos.tarjeta} ${estilos.tarjetaError}`}>
          <h1 className={estilos.titulo}>Algo salió mal</h1>
          <p className={estilos.texto}>{error}</p>
          <Link to="/" className={estilos.enlace}>Volver al inicio</Link>
        </div>
      </div>
    )
  }

  const aprobado = comprobante?.estado === 'pagado'

  return (
    <div className={estilos.contenedor}>
      <div className={`${estilos.tarjeta} ${aprobado ? estilos.tarjetaOk : estilos.tarjetaPendiente}`}>
        <h1 className={estilos.titulo}>
          {aprobado ? '¡Pago aprobado!' : 'Estado del pedido'}
        </h1>
        <p className={estilos.texto}>
          {aprobado
            ? 'Tu pedido ya está registrado. El establecimiento lo verá en su panel con estado pagado.'
            : `Estado actual: ${comprobante?.estado ?? 'desconocido'}. Si acabas de pagar, espera unos segundos y recarga.`}
        </p>

        <ul className={estilos.resumen}>
          <li>
            <span>Establecimiento</span>
            <strong>{comprobante?.establecimiento_nombre ?? '—'}</strong>
          </li>
          <li>
            <span>Referencia</span>
            <strong>{comprobante?.external_reference}</strong>
          </li>
          <li>
            <span>Total</span>
            <strong>{formatear(comprobante?.total)}</strong>
          </li>
          {comprobante?.mp_payment_id && (
            <li>
              <span>ID pago (Mercado Pago)</span>
              <strong>{comprobante.mp_payment_id}</strong>
            </li>
          )}
        </ul>

        {Array.isArray(comprobante?.items) && comprobante.items.length > 0 && (
          <div className={estilos.lineas}>
            <h2 className={estilos.subtitulo}>Detalle</h2>
            <ul>
              {comprobante.items.map((it, i) => (
                <li key={`${it.producto_id}-${i}`}>
                  {it.nombre} × {it.cantidad} — {formatear(it.precio_unitario * it.cantidad)}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Link to="/" className={estilos.enlace}>Seguir comprando</Link>
      </div>
    </div>
  )
}

export default PaginaRetornoPago
