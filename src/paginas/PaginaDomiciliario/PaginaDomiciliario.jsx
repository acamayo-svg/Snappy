import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contextos/ContextoAuth'
import {
  listarPedidosDomiciliarioApi,
  reclamarPedidoDomiciliarioApi,
  marcarPedidoEnCaminoApi,
  marcarPedidoEntregadoApi,
} from '../../servicios/servicioPagos'
import estilos from './PaginaDomiciliario.module.css'

function PaginaDomiciliario() {
  const { usuario } = useAuth()
  const tieneDomiciliario = usuario?.tieneRol('domiciliario')

  const [disponibles, setDisponibles] = useState([])
  const [misPedidos, setMisPedidos] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const [accionId, setAccionId] = useState(null)

  const cargar = useCallback(async () => {
    if (!tieneDomiciliario) return
    setCargando(true)
    setError(null)
    try {
      const data = await listarPedidosDomiciliarioApi()
      setDisponibles(Array.isArray(data.disponibles) ? data.disponibles : [])
      setMisPedidos(Array.isArray(data.mis_pedidos) ? data.mis_pedidos : [])
    } catch (e) {
      setError(e?.message ?? 'Error al cargar pedidos')
      setDisponibles([])
      setMisPedidos([])
    } finally {
      setCargando(false)
    }
  }, [tieneDomiciliario])

  useEffect(() => {
    cargar()
  }, [cargar])

  const formatearPrecio = (valor) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(valor)

  async function reclamar(id) {
    setAccionId(id)
    setError(null)
    try {
      await reclamarPedidoDomiciliarioApi(id)
      await cargar()
    } catch (e) {
      setError(e?.message ?? 'Error al reclamar')
    } finally {
      setAccionId(null)
    }
  }

  async function enCamino(id) {
    setAccionId(id)
    setError(null)
    try {
      await marcarPedidoEnCaminoApi(id)
      await cargar()
    } catch (e) {
      setError(e?.message ?? 'Error al marcar en camino')
    } finally {
      setAccionId(null)
    }
  }

  async function entregado(id) {
    setAccionId(id)
    setError(null)
    try {
      await marcarPedidoEntregadoApi(id)
      await cargar()
    } catch (e) {
      setError(e?.message ?? 'Error al marcar entregado')
    } finally {
      setAccionId(null)
    }
  }

  if (!tieneDomiciliario) {
    return (
      <div className={estilos.contenedor}>
        <section className={estilos.banner}>
          <div className={estilos.bannerContenido}>
            <h1 className={estilos.titulo}>Sé domiciliario Snappy</h1>
            <p className={estilos.subtitulo}>
              Horarios flexibles, ingresos extras. Recoge pedidos en establecimientos y entrégalos a domicilio.
            </p>
            <span className={estilos.badge}>Domiciliario</span>
          </div>
        </section>
        <div className={estilos.contenido}>
          <section className={estilos.tarjetas}>
            <article className={estilos.tarjeta}>
              <span className={estilos.tarjetaIcono}>🛵</span>
              <h3 className={estilos.tarjetaTitulo}>Tú eliges cuándo</h3>
              <p className={estilos.tarjetaTexto}>
                Conecta cuando quieras y acepta los pedidos que te convengan.
              </p>
            </article>
            <article className={estilos.tarjeta}>
              <span className={estilos.tarjetaIcono}>💰</span>
              <h3 className={estilos.tarjetaTitulo}>Gana por entrega</h3>
              <p className={estilos.tarjetaTexto}>
                Cobra por cada entrega completada de forma segura.
              </p>
            </article>
            <article className={estilos.tarjeta}>
              <span className={estilos.tarjetaIcono}>📍</span>
              <h3 className={estilos.tarjetaTitulo}>Rutas claras</h3>
              <p className={estilos.tarjetaTexto}>
                Recoge en el establecimiento y lleva hasta la dirección del cliente.
              </p>
            </article>
          </section>

          <section className={estilos.seccionRegistro}>
            <div className={estilos.cajaRegistro}>
              <h2 className={estilos.tituloRegistro}>Quiero ser domiciliario</h2>
              <p className={estilos.textoRegistro}>
                Si quieres repartir pedidos y ganar por cada entrega, crea una cuenta en Snappy y desde{' '}
                <strong>Mi cuenta</strong> activa la opción &quot;Ser domiciliario&quot;.
              </p>
              {!usuario ? (
                <div className={estilos.botonesRegistro}>
                  <Link to="/registro" className={estilos.botonPrincipal}>
                    Crear cuenta
                  </Link>
                  <Link to="/login" className={estilos.botonSecundario}>
                    Ya tengo cuenta
                  </Link>
                </div>
              ) : (
                <div className={estilos.botonesRegistro}>
                  <Link to="/cuenta" className={estilos.botonPrincipal}>
                    Activar en Mi cuenta
                  </Link>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className={estilos.contenedor}>
      <section className={estilos.banner}>
        <div className={estilos.bannerContenido}>
          <h1 className={estilos.titulo}>Tus entregas</h1>
          <p className={estilos.subtitulo}>
            Reclamá pedidos listos en el local, marcá en camino y entregado cuando el cliente reciba.
          </p>
          <span className={estilos.badge}>Domiciliario</span>
        </div>
      </section>

      <div className={estilos.contenido}>
        <div className={estilos.panelPedidosCab}>
          <h2 className={estilos.panelPedidosTitulo}>Pedidos</h2>
          <button type="button" className={estilos.botonActualizar} onClick={cargar} disabled={cargando}>
            {cargando ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>
        {error && (
          <div className={estilos.mensajeError} role="alert">
            {error}
          </div>
        )}

        <div className={estilos.gridDomicilio}>
          <section className={estilos.columnaDom}>
            <h3 className={estilos.columnaDomTitulo}>Disponibles para reclamar</h3>
            {disponibles.length === 0 ? (
              <p className={estilos.vacioDom}>No hay pedidos listos sin asignar.</p>
            ) : (
              <ul className={estilos.listaDom}>
                {disponibles.map((p) => (
                  <li key={p.id} className={estilos.tarjetaDom}>
                    <p className={estilos.tarjetaDomNegocio}>{p.establecimiento_nombre}</p>
                    <p className={estilos.tarjetaDomRef}>{p.external_reference}</p>
                    <p className={estilos.tarjetaDomPrecio}>{formatearPrecio(p.total)}</p>
                    <p className={estilos.tarjetaDomDir}>
                      <strong>Recoger</strong> {p.establecimiento_direccion || '—'}
                    </p>
                    <p className={estilos.tarjetaDomDir}>
                      <strong>Entregar</strong> {p.envio?.direccion || '—'}
                    </p>
                    <p className={estilos.tarjetaDomTel}>Tel. cliente: {p.envio?.telefono || '—'}</p>
                    {p.envio?.nota ? <p className={estilos.tarjetaDomNota}>Nota: {p.envio.nota}</p> : null}
                    <button
                      type="button"
                      className={estilos.botonDomPrimario}
                      disabled={accionId === p.id}
                      onClick={() => reclamar(p.id)}
                    >
                      {accionId === p.id ? '…' : 'Reclamar pedido'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={estilos.columnaDom}>
            <h3 className={estilos.columnaDomTitulo}>Mis pedidos</h3>
            {misPedidos.length === 0 ? (
              <p className={estilos.vacioDom}>Aún no tenés pedidos asignados.</p>
            ) : (
              <ul className={estilos.listaDom}>
                {misPedidos.map((p) => (
                  <li key={p.id} className={estilos.tarjetaDom}>
                    <p className={estilos.tarjetaDomNegocio}>{p.establecimiento_nombre}</p>
                    <p className={estilos.tarjetaDomEstado}>
                      {p.estado === 'listo_reparto' ? 'Listo — recoger en local' : 'En camino'}
                    </p>
                    <p className={estilos.tarjetaDomDir}>
                      <strong>Entregar</strong> {p.envio?.direccion || '—'}
                    </p>
                    <p className={estilos.tarjetaDomTel}>Tel. {p.envio?.telefono || '—'}</p>
                    {p.envio?.nota ? <p className={estilos.tarjetaDomNota}>Nota: {p.envio.nota}</p> : null}
                    {p.estado === 'listo_reparto' && (
                      <button
                        type="button"
                        className={estilos.botonDomPrimario}
                        disabled={accionId === p.id}
                        onClick={() => enCamino(p.id)}
                      >
                        {accionId === p.id ? '…' : 'Salí a entregar'}
                      </button>
                    )}
                    {p.estado === 'en_camino' && (
                      <button
                        type="button"
                        className={estilos.botonDomEntregado}
                        disabled={accionId === p.id}
                        onClick={() => entregado(p.id)}
                      >
                        {accionId === p.id ? '…' : 'Marcar entregado'}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

export default PaginaDomiciliario
