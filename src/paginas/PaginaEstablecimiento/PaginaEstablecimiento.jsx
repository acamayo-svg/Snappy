import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contextos/ContextoAuth'
import {
  listarMisProductosApi,
  crearProductoApi,
  actualizarProductoApi,
  eliminarProductoApi,
  subirImagenProductoApi,
} from '../../servicios/servicioProductos'
import {
  listarPedidosEstablecimientoApi,
  avanzarEstadoPedidoEstablecimientoApi,
} from '../../servicios/servicioPagos'
import estilos from './PaginaEstablecimiento.module.css'

function PaginaEstablecimiento() {
  const { usuario } = useAuth()
  const tieneEstablecimiento = usuario?.tieneRol('establecimiento')

  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [precio, setPrecio] = useState('')
  const [imagen, setImagen] = useState('')
  const [subiendoImagen, setSubiendoImagen] = useState(false)
  const [pedidos, setPedidos] = useState([])
  const [cargandoPedidos, setCargandoPedidos] = useState(false)
  const [errorPedidos, setErrorPedidos] = useState(null)
  const [actualizandoPedidoId, setActualizandoPedidoId] = useState(null)

  const cargarProductos = useCallback(async () => {
    if (!tieneEstablecimiento) return
    setCargando(true)
    setError(null)
    try {
      const lista = await listarMisProductosApi()
      setProductos(lista)
    } catch (e) {
      setError(e?.message ?? 'Error al cargar productos')
    } finally {
      setCargando(false)
    }
  }, [tieneEstablecimiento])

  const cargarPedidos = useCallback(async () => {
    if (!tieneEstablecimiento) return
    setCargandoPedidos(true)
    setErrorPedidos(null)
    try {
      const lista = await listarPedidosEstablecimientoApi()
      setPedidos(Array.isArray(lista) ? lista : [])
    } catch (e) {
      setErrorPedidos(e?.message ?? 'Error al cargar pedidos')
      setPedidos([])
    } finally {
      setCargandoPedidos(false)
    }
  }, [tieneEstablecimiento])

  useEffect(() => {
    cargarProductos()
  }, [cargarProductos])

  useEffect(() => {
    cargarPedidos()
  }, [cargarPedidos])

  const limpiarForm = () => {
    setEditandoId(null)
    setNombre('')
    setDescripcion('')
    setPrecio('')
    setImagen('')
    setMostrarForm(false)
  }

  const abrirEditar = (p) => {
    setEditandoId(p.id)
    setNombre(p.nombre)
    setDescripcion(p.descripcion ?? '')
    setPrecio(String(p.precio))
    setImagen(p.imagen ?? '')
    setMostrarForm(true)
    setError(null)
  }

  const enviarForm = async (e) => {
    e.preventDefault()
    const precioNum = precio.trim() === '' ? 0 : Number(precio.replace(',', '.'))
    if (Number.isNaN(precioNum) || precioNum < 0) {
      setError('El precio debe ser un número mayor o igual a 0')
      return
    }
    setError(null)
    setCargando(true)
    try {
      if (editandoId) {
        await actualizarProductoApi(editandoId, {
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
          precio: precioNum,
          imagen: imagen.trim() || null,
        })
      } else {
        await crearProductoApi({
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
          precio: precioNum,
          imagen: imagen.trim() || null,
        })
      }
      limpiarForm()
      await cargarProductos()
    } catch (e) {
      setError(e?.message ?? 'Error al guardar')
    } finally {
      setCargando(false)
    }
  }

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar este producto?')) return
    setCargando(true)
    setError(null)
    try {
      await eliminarProductoApi(id)
      await cargarProductos()
    } catch (e) {
      setError(e?.message ?? 'Error al eliminar')
    } finally {
      setCargando(false)
    }
  }

  const formatearPrecio = (valor) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(valor)
  }

  const etiquetaEstadoPedido = (estado) => {
    const mapa = {
      pagado: 'Pagado',
      esperando_pago: 'Esperando pago',
      rechazado: 'Rechazado',
      pendiente_wompi: 'Pendiente (Wompi)',
      pendiente_mp: 'Pendiente (hist.)',
      en_preparacion: 'En preparación',
      listo_reparto: 'Listo / reparto',
      en_camino: 'En camino',
      entregado: 'Entregado',
    }
    return mapa[estado] ?? estado
  }

  const columnasKanban = [
    { id: 'pago', titulo: 'Pago pendiente', estados: ['esperando_pago', 'pendiente_wompi'] },
    { id: 'por_hacer', titulo: 'Pagado', estados: ['pagado'] },
    { id: 'cocina', titulo: 'En preparación', estados: ['en_preparacion'] },
    { id: 'listo', titulo: 'Listo reparto', estados: ['listo_reparto'] },
    { id: 'camino', titulo: 'En camino', estados: ['en_camino'] },
    { id: 'hecho', titulo: 'Entregado', estados: ['entregado'] },
    { id: 'fallo', titulo: 'Rechazado', estados: ['rechazado'] },
  ]

  const refPedidoCorta = (ref) => {
    const s = String(ref || '')
    return s.length > 10 ? `…${s.slice(-8)}` : s
  }

  const avanzarPedido = async (pedidoId, siguiente) => {
    setActualizandoPedidoId(pedidoId)
    setErrorPedidos(null)
    try {
      await avanzarEstadoPedidoEstablecimientoApi(pedidoId, siguiente)
      await cargarPedidos()
    } catch (e) {
      setErrorPedidos(e?.message ?? 'No se pudo actualizar el pedido')
    } finally {
      setActualizandoPedidoId(null)
    }
  }

  if (!tieneEstablecimiento) {
    return (
      <div className={estilos.contenedor}>
        <section className={estilos.banner}>
          <div className={estilos.bannerContenido}>
            <h1 className={estilos.titulo}>Tu tienda en Snappy</h1>
            <p className={estilos.subtitulo}>
              Llega a más clientes, gestiona pedidos y haz crecer tu negocio con entregas a domicilio.
            </p>
            <span className={estilos.badge}>Establecimiento</span>
          </div>
        </section>
        <div className={estilos.contenido}>
          <section className={estilos.tarjetas}>
            <article className={estilos.tarjeta}>
              <span className={estilos.tarjetaIcono}>📦</span>
              <h3 className={estilos.tarjetaTitulo}>Gestiona pedidos</h3>
              <p className={estilos.tarjetaTexto}>
                Recibe y organiza los pedidos de tus clientes en un solo lugar.
              </p>
            </article>
            <article className={estilos.tarjeta}>
              <span className={estilos.tarjetaIcono}>📍</span>
              <h3 className={estilos.tarjetaTitulo}>Tu ubicación</h3>
              <p className={estilos.tarjetaTexto}>
                Los domiciliarios recogen en tu establecimiento y entregan a domicilio.
              </p>
            </article>
            <article className={estilos.tarjeta}>
              <span className={estilos.tarjetaIcono}>📈</span>
              <h3 className={estilos.tarjetaTitulo}>Más ventas</h3>
              <p className={estilos.tarjetaTexto}>
                Amplía tu alcance sin abrir más tiendas físicas.
              </p>
            </article>
          </section>

          <section className={estilos.seccionRegistro}>
            <div className={estilos.cajaRegistro}>
              <h2 className={estilos.tituloRegistro}>Registra tu establecimiento</h2>
              <p className={estilos.textoRegistro}>
                ¿Tienes un restaurante, tienda o negocio y quieres vender por Snappy? Crea una cuenta
                y desde <strong>Mi cuenta</strong> podrás registrar tu negocio en pocos pasos.
              </p>
              {!usuario ? (
                <div className={estilos.botonesRegistro}>
                  <Link to="/registro" className={estilos.botonPrincipal}>Crear cuenta</Link>
                  <Link to="/login" className={estilos.botonSecundario}>Ya tengo cuenta</Link>
                </div>
              ) : (
                <div className={estilos.botonesRegistro}>
                  <Link to="/cuenta" className={estilos.botonPrincipal}>
                    Registrar mi negocio en Mi cuenta
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
          <h1 className={estilos.titulo}>Dashboard de tu negocio</h1>
          <p className={estilos.subtitulo}>
            Administra productos, pedidos y notifica a domiciliarios cuando esté listo el envío.
          </p>
          <span className={estilos.badge}>Establecimiento</span>
        </div>
      </section>

      <div className={estilos.contenido}>
        <section className={estilos.dashboardSeccion}>
          <h2 className={estilos.dashboardTitulo}>Mis productos</h2>
          <p className={estilos.textoRegistro} style={{ marginBottom: '1rem', color: 'var(--snappy-gris-secundario)' }}>
            Los productos que agregues aquí se mostrarán en la página principal y en el área de cliente para que puedan pedirlos.
          </p>

          {error && (
            <div className={estilos.mensajeErrorProducto} role="alert">
              {error}
            </div>
          )}

          {!mostrarForm ? (
            <button
              type="button"
              className={estilos.botonAgregar}
              onClick={() => {
                limpiarForm()
                setMostrarForm(true)
                setError(null)
              }}
              disabled={cargando}
            >
              + Agregar producto
            </button>
          ) : (
            <div className={estilos.cajaDashboard}>
              <h3 className={estilos.dashboardTitulo} style={{ fontSize: 'var(--snappy-texto-lg)' }}>
                {editandoId ? 'Editar producto' : 'Nuevo producto'}
              </h3>
              <form onSubmit={enviarForm} className={estilos.formProducto}>
                <label className={estilos.etiqueta}>
                  Nombre
                  <input
                    type="text"
                    className={estilos.campoInput}
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. Combo familiar"
                    required
                    disabled={cargando}
                  />
                </label>
                <label className={estilos.etiqueta}>
                  Descripción
                  <textarea
                    className={estilos.campoInput}
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Descripción del producto"
                    disabled={cargando}
                  />
                </label>
                <label className={estilos.etiqueta}>
                  Precio (COP) — entero o decimal
                  <input
                    type="text"
                    className={estilos.campoInput}
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    placeholder="Ej. 15900 o 12.50"
                    required
                    disabled={cargando}
                  />
                </label>
                <label className={estilos.etiqueta}>
                  Imagen del producto (opcional)
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className={estilos.campoInput}
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const maxBytes = 4 * 1024 * 1024 // 4 MB (límite en Vercel)
                      if (file.size > maxBytes) {
                        setError(`La imagen no debe superar 4 MB (tiene ${(file.size / 1024 / 1024).toFixed(1)} MB). Comprímela o elige otra.`)
                        e.target.value = ''
                        return
                      }
                      setSubiendoImagen(true)
                      setError(null)
                      try {
                        const url = await subirImagenProductoApi(file)
                        setImagen(url)
                      } catch (err) {
                        setError(err?.message ?? 'Error al subir la imagen')
                      } finally {
                        setSubiendoImagen(false)
                        e.target.value = ''
                      }
                    }}
                    disabled={cargando || subiendoImagen}
                  />
                  <span style={{ fontSize: 'var(--snappy-texto-xs)', color: 'var(--snappy-gris-secundario)', marginTop: '0.25rem', display: 'block' }}>
                    JPEG, PNG, GIF o WebP. Máximo 4 MB. Se verá en la tarjeta del producto.
                  </span>
                  {subiendoImagen && (
                    <span style={{ fontSize: 'var(--snappy-texto-sm)', color: 'var(--snappy-gris-secundario)', marginTop: '0.5rem', display: 'block' }}>
                      Subiendo…
                    </span>
                  )}
                  {imagen && (
                    <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <img
                        src={imagen}
                        alt="Vista previa"
                        style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 'var(--snappy-radio-pequeño)', border: '1px solid var(--snappy-gris-borde)' }}
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                      <button
                        type="button"
                        className={estilos.botonCancelar}
                        onClick={() => setImagen('')}
                        disabled={cargando}
                      >
                        Quitar imagen
                      </button>
                    </div>
                  )}
                </label>
                <div className={estilos.botonesFormProducto}>
                  <button type="submit" className={estilos.botonGuardar} disabled={cargando}>
                    {cargando ? 'Guardando…' : editandoId ? 'Guardar cambios' : 'Agregar producto'}
                  </button>
                  <button
                    type="button"
                    className={estilos.botonCancelar}
                    onClick={limpiarForm}
                    disabled={cargando}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className={estilos.cajaDashboard}>
            {cargando && !mostrarForm && productos.length === 0 ? (
              <p className={estilos.listaVacia}>Cargando productos…</p>
            ) : productos.length === 0 ? (
              <p className={estilos.listaVacia}>
                Aún no tienes productos. Agrega el primero para que los clientes puedan verlos en la página principal y en Cliente.
              </p>
            ) : (
              <table className={estilos.tablaProductos}>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Descripción</th>
                    <th>Precio</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {productos.map((p) => (
                    <tr key={p.id}>
                      <td>{p.nombre}</td>
                      <td>{p.descripcion || '—'}</td>
                      <td className={estilos.precioCelda}>{formatearPrecio(p.precio)}</td>
                      <td>
                        <div className={estilos.accionesCelda}>
                          <button
                            type="button"
                            className={estilos.botonIcono}
                            onClick={() => abrirEditar(p)}
                            disabled={cargando}
                            title="Editar"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className={`${estilos.botonIcono} ${estilos.botonIconoPeligro}`}
                            onClick={() => eliminar(p.id)}
                            disabled={cargando}
                            title="Eliminar"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className={estilos.dashboardSeccion}>
          <div className={estilos.cabeceraPedidos}>
            <h2 className={estilos.dashboardTitulo}>Pedidos y reparto</h2>
            <button
              type="button"
              className={estilos.botonIcono}
              onClick={cargarPedidos}
              disabled={cargandoPedidos}
            >
              {cargandoPedidos ? 'Actualizando…' : 'Actualizar'}
            </button>
          </div>
          <p className={estilos.textoRegistro} style={{ marginBottom: '1rem', color: 'var(--snappy-gris-secundario)' }}>
            Organiza por etapa: pago pendiente, pagado, cocina, listo para que un domiciliario lo reclame, en camino y
            entregado. Cada tarjeta muestra envío y contacto del cliente.
          </p>
          {errorPedidos && (
            <div className={estilos.mensajeErrorProducto} role="alert">
              {errorPedidos}
            </div>
          )}
          {cargandoPedidos && pedidos.length === 0 ? (
            <p className={estilos.listaVacia}>Cargando pedidos…</p>
          ) : pedidos.length === 0 ? (
            <div className={estilos.cajaDashboard}>
              <p className={estilos.listaVacia}>
                Aún no hay pedidos. Cuando un cliente pague con Wompi, aparecerán aquí en tarjetas por columna.
              </p>
            </div>
          ) : (
            <div className={estilos.kanban}>
              {columnasKanban.map((col) => {
                const enColumna = pedidos.filter((p) => col.estados.includes(p.estado))
                return (
                  <div key={col.id} className={estilos.kanbanColumna}>
                    <h3 className={estilos.kanbanTitulo}>
                      {col.titulo}
                      <span className={estilos.kanbanContador}>{enColumna.length}</span>
                    </h3>
                    <div className={estilos.kanbanTarjetas}>
                      {enColumna.length === 0 ? (
                        <p className={estilos.kanbanVacio}>—</p>
                      ) : (
                        enColumna.map((ped) => (
                          <article key={ped.id} className={estilos.tarjetaPedido}>
                            <div className={estilos.tarjetaPedidoCab}>
                              <span className={estilos.tarjetaPedidoRef} title={ped.external_reference}>
                                {refPedidoCorta(ped.external_reference)}
                              </span>
                              <span
                                className={
                                  ped.estado === 'pagado' || ped.estado === 'entregado'
                                    ? estilos.badgePagado
                                    : estilos.badgeOtroEstado
                                }
                              >
                                {etiquetaEstadoPedido(ped.estado)}
                              </span>
                            </div>
                            <p className={estilos.tarjetaPedidoCliente}>
                              {ped.cliente_nombre || 'Cliente'}
                              {ped.cliente_correo && (
                                <span className={estilos.tarjetaPedidoMeta}>{ped.cliente_correo}</span>
                              )}
                            </p>
                            <p className={estilos.tarjetaPedidoEnvio}>
                              <strong>Envío</strong>
                              <span>{ped.envio?.direccion || '—'}</span>
                              <span className={estilos.tarjetaPedidoMeta}>
                                Tel. {ped.envio?.telefono || '—'}
                              </span>
                              {ped.envio?.nota ? (
                                <span className={estilos.tarjetaPedidoMeta}>Nota: {ped.envio.nota}</span>
                              ) : null}
                            </p>
                            {ped.domiciliario_nombre && (
                              <p className={estilos.tarjetaPedidoDom}>
                                Domiciliario: {ped.domiciliario_nombre}
                                {ped.en_camino_en && ped.estado === 'en_camino' && (
                                  <span className={estilos.tarjetaPedidoMeta}>
                                    Salida:{' '}
                                    {new Date(ped.en_camino_en).toLocaleString('es-CO', {
                                      dateStyle: 'short',
                                      timeStyle: 'short',
                                    })}
                                  </span>
                                )}
                                {ped.entregado_en && ped.estado === 'entregado' && (
                                  <span className={estilos.tarjetaPedidoMeta}>
                                    Entregado:{' '}
                                    {new Date(ped.entregado_en).toLocaleString('es-CO', {
                                      dateStyle: 'short',
                                      timeStyle: 'short',
                                    })}
                                  </span>
                                )}
                              </p>
                            )}
                            <p className={estilos.tarjetaPedidoItems}>
                              {Array.isArray(ped.items) &&
                                ped.items.slice(0, 4).map((it) => (
                                  <span key={`${ped.id}-${it.producto_id}`} className={estilos.tarjetaPedidoLineaItem}>
                                    {it.nombre} ×{it.cantidad}
                                  </span>
                                ))}
                              {Array.isArray(ped.items) && ped.items.length > 4 && (
                                <span className={estilos.tarjetaPedidoMeta}>+{ped.items.length - 4} más</span>
                              )}
                            </p>
                            <p className={estilos.tarjetaPedidoTotal}>{formatearPrecio(ped.total)}</p>
                            <p className={estilos.tarjetaPedidoFecha}>
                              {ped.creado_en
                                ? new Date(ped.creado_en).toLocaleString('es-CO', {
                                    dateStyle: 'short',
                                    timeStyle: 'short',
                                  })
                                : '—'}
                            </p>
                            {ped.transaction_id && (
                              <p className={estilos.tarjetaPedidoMeta}>Wompi #{ped.transaction_id}</p>
                            )}
                            <div className={estilos.tarjetaPedidoAcciones}>
                              {ped.estado === 'pagado' && (
                                <button
                                  type="button"
                                  className={estilos.botonMiniAccion}
                                  disabled={actualizandoPedidoId === ped.id}
                                  onClick={() => avanzarPedido(ped.id, 'en_preparacion')}
                                >
                                  A cocina
                                </button>
                              )}
                              {ped.estado === 'en_preparacion' && (
                                <button
                                  type="button"
                                  className={estilos.botonMiniAccion}
                                  disabled={actualizandoPedidoId === ped.id}
                                  onClick={() => avanzarPedido(ped.id, 'listo_reparto')}
                                >
                                  Listo para reparto
                                </button>
                              )}
                            </div>
                          </article>
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default PaginaEstablecimiento
