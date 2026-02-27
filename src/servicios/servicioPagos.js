/**
 * Servicio de pagos: crea preferencia en el backend y devuelve URL de Mercado Pago (Checkout Pro).
 */

const URL_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')

/**
 * @param {Array<{ title: string, quantity: number, unit_price: number }>} items
 * @param {{ email?: string }} [payer] - opcional; email del comprador (ayuda en sandbox)
 * @returns {Promise<{ url: string }>}
 */
export async function crearPreferenciaPagoApi(items, payer) {
  const res = await fetch(`${URL_BASE}/api/pagos/preferencia`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, ...(payer?.email && { payer }) }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.mensaje ?? 'Error al crear el pago')
  return data
}
