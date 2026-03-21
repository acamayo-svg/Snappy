import { Router } from 'express'
import { urlBaseServidor } from '../config/urlPublica.js'

const router = Router()

/**
 * POST /api/pagos/preferencia
 * Cuerpo: { items: [ { title, quantity, unit_price } ] }
 * Devuelve: { url } para redirigir al usuario a Checkout Pro.
 */
router.post('/preferencia', async (req, res) => {
  try {
    const { items } = req.body
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ mensaje: 'Se requiere un array "items" con al menos un producto.' })
    }

    if (!process.env.MP_ACCESS_TOKEN) {
      return res.status(503).json({
        mensaje: 'Mercado Pago no configurado. Añade MP_ACCESS_TOKEN en el .env del servidor.',
      })
    }

    const baseUrl = urlBaseServidor()
    const webhookUrl = !baseUrl.includes('localhost')
      ? `${baseUrl.replace(/\/$/, '')}/api/pagos/webhook`
      : null

    const { crearPreferencia } = await import('../mercadoPago.js')
    const { url } = await crearPreferencia(items, {}, {}, webhookUrl)
    if (!url) {
      return res.status(502).json({ mensaje: 'No se pudo obtener la URL de pago de Mercado Pago.' })
    }

    res.json({ url })
  } catch (err) {
    console.error('Error al crear preferencia Mercado Pago:', err)
    const status =
      err?.code === 'MP_SANDBOX_CREDENTIALS' ? 503 :
      err?.code === 'MP_NO_ITEMS' ? 400 : 500
    res.status(status).json({
      mensaje: err?.message ?? 'Error al crear la preferencia de pago.',
    })
  }
})

/**
 * POST /api/pagos/webhook
 * Notificaciones de Mercado Pago (Webhooks).
 * Cuerpo esperado: { type: "payment", data: { id: "123" } } o { topic: "payment", id: "123" }
 * Respondemos 200 enseguida y procesamos en segundo plano.
 */
router.post('/webhook', (req, res) => {
  res.status(200).send()

  const body = req.body || {}
  const type = body.type ?? body.topic
  const paymentId = body.data?.id ?? body.id ?? body['data.id']

  if (type !== 'payment' || !paymentId) {
    return
  }

  ;(async () => {
    try {
      const { obtenerPago } = await import('../mercadoPago.js')
      const pago = await obtenerPago(String(paymentId))
      if (!pago) return
      const status = pago.status
      console.log(`[Webhook MP] Pago ${paymentId} estado: ${status}`)
      if (status === 'approved') {
        // Aquí puedes crear el pedido en BD y notificar al establecimiento
        console.log(`[Webhook MP] Pago aprobado: ${paymentId}, monto: ${pago.transaction_amount}`)
      }
    } catch (err) {
      console.error('[Webhook MP] Error al procesar notificación:', err)
    }
  })()
})

export default router
