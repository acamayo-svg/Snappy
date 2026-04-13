import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { obtenerComprobanteApi, sincronizarPagoWompiApi } from '../../servicios/servicioPagos'
import { useCarrito } from '../../contextos/ContextoCarrito'
import estilos from './PaginaRetornoPago.module.css'

const REF_STORAGE = 'snappy_wompi_ref'

/** Pago confirmado según la fila devuelta por /sincronizar (antes del comprobante). */
function pagoAprobadoSegunPedidoSync(pedido) {
  if (!pedido) return false
  if (pedido.estado === 'pagado') return true
  return String(pedido.wompi_status || '').toUpperCase() === 'APPROVED'
}

/**
 * Retorno tras pagar con Wompi Widget (redirect-url + ?id=transacción).
 */
function PaginaRetornoPago() {
  const [params] = useSearchParams()
  const { vaciarCarrito } = useCarrito()
  const [comprobante, setComprobante] = useState(null)
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(true)

  const transactionId = params.get('id')
  const refParam = params.get('reference') || params.get('ref')

  useEffect(() => {
    let cancel = false

    async function cargar() {
      if (!transactionId) {
        setCargando(false)
        setError('No se recibió el identificador de la transacción. Vuelve al carrito e intenta de nuevo.')
        return
      }

      const referenceGuardada = refParam || sessionStorage.getItem(REF_STORAGE) || ''

      try {
        const sync = await sincronizarPagoWompiApi(transactionId, referenceGuardada)
        if (cancel) return

        if (pagoAprobadoSegunPedidoSync(sync?.pedido)) {
          vaciarCarrito()
        }

        const refPedido = sync?.pedido?.external_reference || referenceGuardada
        if (!refPedido) {
          throw new Error('No se pudo obtener la referencia del pedido')
        }

        const comp = await obtenerComprobanteApi(refPedido)
        if (cancel) return
        setComprobante(comp)
        sessionStorage.removeItem(REF_STORAGE)
        if (comp?.estado === 'pagado' || String(comp?.wompi_status || '').toUpperCase() === 'APPROVED') {
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
  }, [transactionId, refParam, vaciarCarrito])

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
          {comprobante?.transaction_id && (
            <li>
              <span>ID transacción (Wompi)</span>
              <strong>{comprobante.transaction_id}</strong>
            </li>
          )}
          {comprobante?.wompi_status && (
            <li>
              <span>Estado Wompi</span>
              <strong>{comprobante.wompi_status}</strong>
            </li>
          )}
          {comprobante?.envio?.direccion && (
            <li>
              <span>Envío</span>
              <strong>
                {comprobante.envio.direccion}
                {comprobante.envio.telefono ? ` · Tel. ${comprobante.envio.telefono}` : ''}
              </strong>
            </li>
          )}
          {comprobante?.envio?.nota ? (
            <li>
              <span>Nota</span>
              <strong>{comprobante.envio.nota}</strong>
            </li>
          ) : null}
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
