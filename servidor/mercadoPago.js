/**
 * Mercado Pago: inicialización del SDK con credenciales de prueba/producción.
 * Usa en el backend para gestionar preferencias de pago (Checkout Pro).
 */
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago')

const accessToken = process.env.MP_ACCESS_TOKEN || ''

const client = new MercadoPagoConfig({
  accessToken,
  options: { timeout: 5000 },
})

export const preferenceClient = new Preference(client)
export const paymentClient = new Payment(client)

/**
 * Obtiene los datos de un pago por ID (para procesar notificaciones webhook).
 * @param {string} paymentId
 * @returns {Promise<object|null>} datos del pago o null si falla
 */
export async function obtenerPago(paymentId) {
  if (!paymentId) return null
  try {
    const response = await paymentClient.get({ id: paymentId })
    return response?.body ?? response ?? null
  } catch (err) {
    console.error('Error al obtener pago de Mercado Pago:', err.message)
    return null
  }
}

/**
 * Crea una preferencia de pago (Checkout Pro) y devuelve la URL para redirigir al usuario.
 * @param {Array<{ title: string, quantity: number, unit_price: number }>} items
 * @param {{ success: string, failure: string, pending: string }} backUrls - URLs de retorno
 * @returns {Promise<{ url: string }>} url es init_point o sandbox_init_point
 */
export async function crearPreferencia(items, backUrls = {}) {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
  const body = {
    items: items.map((item) => ({
      title: item.title,
      quantity: Number(item.quantity) || 1,
      unit_price: Number(item.unit_price) || 0,
      currency_id: 'COP',
    })),
    back_urls: {
      success: backUrls.success ?? `${baseUrl}/cliente?pago=ok`,
      failure: backUrls.failure ?? `${baseUrl}/cliente?pago=error`,
      pending: backUrls.pending ?? `${baseUrl}/cliente?pago=pending`,
    },
    auto_return: 'approved',
  }

  const response = await preferenceClient.create({ body })
  const data = response?.body ?? response
  const url = data.sandbox_init_point || data.init_point || ''
  return { url }
}
