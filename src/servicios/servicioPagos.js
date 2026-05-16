const URL_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')

function obtenerToken() {
  return sessionStorage.getItem('snappy_token')
}

/** Respuesta del backend para abrir el widget Wompi. */
export async function prepararPagoWompiApi(items, opciones = {}) {
  const token = obtenerToken()
  if (!token) throw new Error('Debes iniciar sesión para pagar')
  const cuerpo = { items }
  if (opciones.envio) {
    cuerpo.envio = {
      direccion: opciones.envio.direccion,
      telefono: opciones.envio.telefono,
      nota: opciones.envio.nota ?? '',
    }
  }
  if (opciones.guardar_envio_en_perfil) {
    cuerpo.guardar_envio_en_perfil = true
  }
  const respuesta = await fetch(`${URL_BASE}/api/pagos/preparar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(cuerpo),
  })
  const data = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) throw new Error(data.mensaje ?? 'No se pudo iniciar el pago')
  return data
}

export async function sincronizarPagoWompiApi(transactionId, reference = '') {
  const q = new URLSearchParams({ id: String(transactionId) })
  if (reference) q.set('reference', String(reference))
  const respuesta = await fetch(`${URL_BASE}/api/pagos/sincronizar?${q}`, {
    headers: { Accept: 'application/json' },
  })
  const data = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) throw new Error(data.mensaje ?? 'No se pudo confirmar el pago')
  return data
}

export async function obtenerComprobanteApi(externalReference) {
  const respuesta = await fetch(`${URL_BASE}/api/pagos/comprobante/${encodeURIComponent(externalReference)}`, {
    headers: { Accept: 'application/json' },
  })
  const data = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) throw new Error(data.mensaje ?? 'Comprobante no disponible')
  return data
}

export async function listarPedidosEstablecimientoApi() {
  const token = obtenerToken()
  if (!token) throw new Error('Sesión requerida')
  const respuesta = await fetch(`${URL_BASE}/api/pagos/pedidos-establecimiento`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  })
  const data = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) throw new Error(data.mensaje ?? 'Error al cargar pedidos')
  return data
}

export async function avanzarEstadoPedidoEstablecimientoApi(pedidoId, siguiente) {
  const token = obtenerToken()
  if (!token) throw new Error('Sesión requerida')
  const respuesta = await fetch(
    `${URL_BASE}/api/pagos/establecimiento/pedidos/${encodeURIComponent(pedidoId)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ siguiente }),
    }
  )
  const data = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) throw new Error(data.mensaje ?? 'Error al actualizar el pedido')
  return data
}

export async function listarPedidosDomiciliarioApi() {
  const token = obtenerToken()
  if (!token) throw new Error('Sesión requerida')
  const respuesta = await fetch(`${URL_BASE}/api/pagos/domiciliario/pedidos`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  })
  const data = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) throw new Error(data.mensaje ?? 'Error al cargar pedidos')
  return data
}

export async function reclamarPedidoDomiciliarioApi(pedidoId) {
  const token = obtenerToken()
  if (!token) throw new Error('Sesión requerida')
  const respuesta = await fetch(
    `${URL_BASE}/api/pagos/domiciliario/pedidos/${encodeURIComponent(pedidoId)}/reclamar`,
    {
      method: 'POST',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    }
  )
  const data = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) throw new Error(data.mensaje ?? 'No se pudo reclamar el pedido')
  return data
}

export async function marcarPedidoEnCaminoApi(pedidoId) {
  const token = obtenerToken()
  if (!token) throw new Error('Sesión requerida')
  const respuesta = await fetch(
    `${URL_BASE}/api/pagos/domiciliario/pedidos/${encodeURIComponent(pedidoId)}/en-camino`,
    {
      method: 'POST',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    }
  )
  const data = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) throw new Error(data.mensaje ?? 'No se pudo marcar en camino')
  return data
}

export async function marcarPedidoEntregadoApi(pedidoId) {
  const token = obtenerToken()
  if (!token) throw new Error('Sesión requerida')
  const respuesta = await fetch(
    `${URL_BASE}/api/pagos/domiciliario/pedidos/${encodeURIComponent(pedidoId)}/entregado`,
    {
      method: 'POST',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    }
  )
  const data = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) throw new Error(data.mensaje ?? 'No se pudo marcar entregado')
  return data
}
