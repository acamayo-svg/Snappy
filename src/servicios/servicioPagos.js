const URL_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')

function obtenerToken() {
  return sessionStorage.getItem('snappy_token')
}

export async function crearPreferenciaApi(items) {
  const token = obtenerToken()
  if (!token) throw new Error('Debes iniciar sesión para pagar')
  const respuesta = await fetch(`${URL_BASE}/api/pagos/preferencia`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ items }),
  })
  const data = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) throw new Error(data.mensaje ?? 'No se pudo iniciar el pago')
  return data
}

export async function sincronizarPagoApi(paymentId, externalReference) {
  const q = new URLSearchParams({
    payment_id: String(paymentId),
    external_reference: String(externalReference),
  })
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
