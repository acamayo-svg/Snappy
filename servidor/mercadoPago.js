/**
 * Mercado Pago: inicialización del SDK con credenciales de prueba/producción.
 * Usa en el backend para gestionar preferencias de pago (Checkout Pro).
 *
 * Para pruebas: MP_ACCESS_TOKEN debe ser el de "Credenciales de prueba"
 * (Tus integraciones > Pruebas > Credenciales de prueba). En Colombia ese token
 * también puede empezar por APP_USR-; lo importante es que sea el de la pestaña de prueba.
 */
import { createRequire } from 'node:module'
import { randomUUID } from 'node:crypto'
import { urlBaseFrontend } from './config/urlPublica.js'

const require = createRequire(import.meta.url)
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago')

const accessToken = process.env.MP_ACCESS_TOKEN || ''
const sandboxOnly = process.env.MP_SANDBOX === 'true' || process.env.MP_SANDBOX === '1'

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
 * @param {{ success?: string, failure?: string, pending?: string }} backUrls - URLs de retorno
 * @param {{ email?: string }} payer - opcional; en sandbox a veces ayuda indicar el payer
 * @param {string} [webhookUrl] - URL de notificaciones (si no se pasa, MP usa la del panel)
 * @returns {Promise<{ url: string }>} url es init_point o sandbox_init_point
 */
export async function crearPreferencia(items, backUrls = {}, payer = {}, webhookUrl) {
  const baseUrl = urlBaseFrontend()
  const body = {
    items: items.map((item) => ({
      title: item.title,
      quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
      unit_price: Math.round(Number(item.unit_price) || 0),
      currency_id: 'COP',
    })),
    external_reference: randomUUID(),
    back_urls: {
      success: backUrls.success ?? `${baseUrl}/cliente?pago=ok`,
      failure: backUrls.failure ?? `${baseUrl}/cliente?pago=error`,
      pending: backUrls.pending ?? `${baseUrl}/cliente?pago=pending`,
    },
    auto_return: 'approved',
    ...(webhookUrl && { notification_url: webhookUrl }),
    // No enviar payer: en sandbox el comprador debe ser el usuario de prueba que inicia sesión en el checkout.
    // Si enviamos otro email (ej. usuario Snappy), MP puede rechazar la tokenización de la tarjeta.
  }

  const response = await preferenceClient.create({ body })
  const data = response?.body ?? response
  const sandboxUrl = data.sandbox_init_point || ''
  const prodUrl = data.init_point || ''

  // Si MP_SANDBOX=true, solo devolver URL de pruebas. Si MP no devuelve sandbox_init_point, avisar.
  if (sandboxOnly) {
    if (sandboxUrl) {
      return { url: sandboxUrl }
    }
    const err = new Error(
      'Mercado Pago no devolvió sandbox_init_point. Comprueba que MP_ACCESS_TOKEN sea el de "Credenciales de prueba" (Tus integraciones > Pruebas).'
    )
    err.code = 'MP_SANDBOX_CREDENTIALS'
    throw err
  }

  const url = sandboxUrl || prodUrl
  return { url }
}
