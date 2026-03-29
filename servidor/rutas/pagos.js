import { Router } from 'express'
import crypto from 'crypto'
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago'
import { obtenerConexion } from '../config/basedatos.js'
import { verificarToken } from '../middleware/verificarToken.js'
import { urlBaseServidor } from '../config/urlPublica.js'

const router = Router()

function urlFrontend() {
  const u = process.env.FRONTEND_URL?.trim().replace(/\/$/, '')
  if (u) return u
  return 'http://localhost:5173'
}

function mpAccessToken() {
  const t = process.env.MP_ACCESS_TOKEN?.trim()
  if (!t) throw new Error('MP_ACCESS_TOKEN no configurado')
  return t
}

function crearClienteMp() {
  return new MercadoPagoConfig({
    accessToken: mpAccessToken(),
    options: { timeout: 15000 },
  })
}

/** COP entero para Checkout Pro (Mercado Pago Colombia). */
function redondearCop(valor) {
  return Math.max(0, Math.round(Number(valor)))
}

async function actualizarPedidoDesdePago(pool, pago) {
  const ext = pago?.external_reference
  if (!ext) return null

  let nuevoEstado = null
  const st = pago.status
  if (st === 'approved') nuevoEstado = 'pagado'
  else if (st === 'rejected' || st === 'cancelled') nuevoEstado = 'rechazado'
  else if (st === 'pending' || st === 'in_process' || st === 'authorized') nuevoEstado = 'pendiente_mp'

  const pid = pago.id != null ? String(pago.id) : null

  await pool.query(
    `UPDATE pedidos
     SET estado = COALESCE($1::text, estado),
         mp_payment_id = COALESCE($2, mp_payment_id),
         mp_status = $3,
         actualizado_en = NOW()
     WHERE external_reference = $4`,
    [nuevoEstado, pid, st ?? null, String(ext)]
  )

  const r = await pool.query(
    `SELECT id, external_reference, estado, total, items_json, mp_payment_id, mp_status,
            establecimiento_id, creado_en
     FROM pedidos WHERE external_reference = $1`,
    [String(ext)]
  )
  return r.rows[0] ?? null
}

async function procesarNotificacionPago(req, res) {
  try {
    const idPago = extraerIdPagoNotificacion(req)
    if (!idPago) {
      return res.status(200).send('ok')
    }

    const secreto = process.env.MP_WEBHOOK_SECRET?.trim()
    if (secreto && req.headers['x-signature']) {
      const ok = verificarFirmaWebhook(req)
      if (!ok) {
        console.warn('[MP webhook] Firma inválida')
        return res.status(401).send('invalid signature')
      }
    }

    const pool = await obtenerConexion()
    const paymentApi = new Payment(crearClienteMp())
    const resultado = await paymentApi.get({ id: idPago })
    const cuerpo = normalizarRespuestaMp(resultado)
    if (cuerpo?.id) {
      await actualizarPedidoDesdePago(pool, cuerpo)
    }
    return res.status(200).send('ok')
  } catch (err) {
    console.error('[MP webhook]', err?.message || err)
    return res.status(500).send('error')
  }
}

/** POST notificación Webhook */
router.post('/webhook', procesarNotificacionPago)

/** IPN antiguo (query string) */
router.get('/webhook', procesarNotificacionPago)

function normalizarRespuestaMp(resultado) {
  if (!resultado || typeof resultado !== 'object') return null
  const { api_response: _a, ...rest } = resultado
  return rest
}

function extraerIdPagoNotificacion(req) {
  const b = req.body || {}
  if (b.data?.id) return String(b.data.id)
  if (b.type === 'payment' && b.id) return String(b.id)
  const q = req.query || {}
  if (q['data.id']) return String(q['data.id'])
  if (q.topic === 'payment' && q.id) return String(q.id)
  return null
}

function verificarFirmaWebhook(req) {
  const secret = process.env.MP_WEBHOOK_SECRET?.trim()
  if (!secret) return false
  const xSig = req.headers['x-signature']
  const xReq = req.headers['x-request-id']
  if (!xSig || !secret) return false

  let ts
  let v1
  for (const part of String(xSig).split(',')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const k = part.slice(0, idx).trim()
    const v = part.slice(idx + 1).trim()
    if (k === 'ts') ts = v
    if (k === 'v1') v1 = v
  }
  const qs = req.query || {}
  const dataId = qs['data.id'] ? String(qs['data.id']) : ''
  const fragmentos = []
  if (dataId) fragmentos.push(`id:${dataId}`)
  if (xReq) fragmentos.push(`request-id:${xReq}`)
  if (ts) fragmentos.push(`ts:${ts}`)
  const manifest = `${fragmentos.join(';')};`
  if (!ts || !v1 || fragmentos.length === 0) return false

  const hmac = crypto.createHmac('sha256', secret).update(manifest).digest('hex')
  return hmac === v1
}

/**
 * Tras volver de MP, sincroniza el pago (por si el webhook aún no llegó).
 * Verifica en la API de MP que el pago corresponde a external_reference.
 */
router.get('/sincronizar', async (req, res) => {
  try {
    const paymentId = req.query.payment_id || req.query.paymentId
    const externalRef = req.query.external_reference || req.query.externalReference
    if (!paymentId || !externalRef) {
      return res.status(400).json({ mensaje: 'Faltan payment_id o external_reference' })
    }

    const pool = await obtenerConexion()
    const pedidoPrevio = await pool.query(
      'SELECT id, external_reference FROM pedidos WHERE external_reference = $1',
      [String(externalRef)]
    )
    if (pedidoPrevio.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Pedido no encontrado' })
    }

    const paymentApi = new Payment(crearClienteMp())
    const resultado = await paymentApi.get({ id: String(paymentId) })
    const pago = normalizarRespuestaMp(resultado)
    if (String(pago?.external_reference) !== String(externalRef)) {
      return res.status(400).json({ mensaje: 'El pago no coincide con el pedido' })
    }

    const fila = await actualizarPedidoDesdePago(pool, pago)
    return res.json({
      ok: true,
      pedido: fila
        ? {
            id: fila.id,
            external_reference: fila.external_reference,
            estado: fila.estado,
            total: Number(fila.total),
            items: fila.items_json,
            mp_payment_id: fila.mp_payment_id,
            mp_status: fila.mp_status,
          }
        : null,
    })
  } catch (err) {
    console.error('[MP sincronizar]', err?.message || err)
    return res.status(500).json({ mensaje: 'No se pudo sincronizar el pago' })
  }
})

/** Comprobante público (quien tenga el external_reference de la URL de retorno) */
router.get('/comprobante/:externalReference', async (req, res) => {
  try {
    const { externalReference } = req.params
    const pool = await obtenerConexion()
    const r = await pool.query(
      `SELECT p.id, p.external_reference, p.estado, p.total, p.items_json, p.mp_payment_id, p.mp_status,
              p.creado_en, e.nombre_negocio AS establecimiento_nombre
       FROM pedidos p
       JOIN establecimientos e ON p.establecimiento_id = e.id
       WHERE p.external_reference = $1`,
      [String(externalReference)]
    )
    if (r.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Pedido no encontrado' })
    }
    const f = r.rows[0]
    return res.json({
      id: f.id,
      external_reference: f.external_reference,
      estado: f.estado,
      total: Number(f.total),
      items: f.items_json,
      mp_payment_id: f.mp_payment_id,
      mp_status: f.mp_status,
      establecimiento_nombre: f.establecimiento_nombre,
      creado_en: f.creado_en,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ mensaje: 'Error al obtener comprobante' })
  }
})

/**
 * Crea preferencia Checkout Pro: ítems validados en BD, un solo establecimiento.
 */
router.post('/preferencia', verificarToken, async (req, res) => {
  try {
    const lineasCliente = req.body?.items
    if (!Array.isArray(lineasCliente) || lineasCliente.length === 0) {
      return res.status(400).json({ mensaje: 'El carrito está vacío' })
    }

    const pool = await obtenerConexion()
    const ids = lineasCliente.map((l) => l.id).filter(Boolean)
    if (ids.length !== lineasCliente.length) {
      return res.status(400).json({ mensaje: 'Cada ítem debe tener id de producto' })
    }

    const unicos = [...new Set(ids)]
    const placeholders = unicos.map((_, i) => `$${i + 1}`).join(',')
    const resProd = await pool.query(
      `SELECT p.id, p.nombre, p.precio, p.establecimiento_id
       FROM productos p WHERE p.id IN (${placeholders})`,
      unicos
    )
    if (resProd.rows.length !== unicos.length) {
      return res.status(400).json({ mensaje: 'Uno o más productos no existen' })
    }

    const porId = new Map(resProd.rows.map((row) => [String(row.id), row]))
    const establecimientosIds = new Set(resProd.rows.map((row) => String(row.establecimiento_id)))
    if (establecimientosIds.size !== 1) {
      return res.status(400).json({
        mensaje: 'Solo puedes pagar productos de un mismo establecimiento en un pedido',
      })
    }
    const establecimientoId = [...establecimientosIds][0]

    const itemsMp = []
    let total = 0
    const itemsGuardar = []

    for (const linea of lineasCliente) {
      const prod = porId.get(String(linea.id))
      if (!prod) continue
      const cant = Math.max(1, parseInt(String(linea.cantidad), 10) || 1)
      const unit = redondearCop(prod.precio)
      const sub = unit * cant
      total += sub
      itemsMp.push({
        title: (prod.nombre || 'Producto').slice(0, 256),
        quantity: cant,
        unit_price: unit,
        currency_id: 'COP',
      })
      itemsGuardar.push({
        producto_id: String(prod.id),
        nombre: prod.nombre,
        cantidad: cant,
        precio_unitario: unit,
      })
    }

    if (itemsMp.length === 0 || total <= 0) {
      return res.status(400).json({ mensaje: 'Total inválido' })
    }

    const insertPedido = await pool.query(
      `INSERT INTO pedidos (
        establecimiento_id, cliente_id, external_reference, estado, total, items_json
      ) VALUES ($1, $2, gen_random_uuid()::text, 'esperando_pago', $3, $4::jsonb)
      RETURNING id, external_reference`,
      [establecimientoId, req.usuarioId, total, JSON.stringify(itemsGuardar)]
    )

    const { id: pedidoId, external_reference: externalRef } = insertPedido.rows[0]
    const baseFront = urlFrontend()
    const baseApi = urlBaseServidor().replace(/\/$/, '')

    const preferenceApi = new Preference(crearClienteMp())
    const prefBody = {
      items: itemsMp,
      external_reference: String(externalRef),
      metadata: { pedido_uuid: String(pedidoId), snappy: '1' },
      back_urls: {
        success: `${baseFront}/pago/exito`,
        failure: `${baseFront}/pago/error`,
        pending: `${baseFront}/pago/pendiente`,
      },
      auto_return: 'approved',
      notification_url: `${baseApi}/api/pagos/webhook`,
      payer: req.usuarioCorreo ? { email: req.usuarioCorreo } : undefined,
    }

    const pref = await preferenceApi.create({ body: prefBody })
    const cuerpo = normalizarRespuestaMp(pref)
    const preferenceId = cuerpo?.id

    if (preferenceId) {
      await pool.query(
        'UPDATE pedidos SET mp_preference_id = $1 WHERE id = $2',
        [String(preferenceId), pedidoId]
      )
    }

    const urlPago = cuerpo?.sandbox_init_point || cuerpo?.init_point
    if (!urlPago) {
      console.error('[MP] Respuesta preference sin URL de pago:', JSON.stringify(cuerpo))
      return res.status(502).json({
        mensaje: 'Mercado Pago no devolvió URL de pago. Revisa MP_ACCESS_TOKEN y moneda COP.',
      })
    }

    return res.json({
      init_point: urlPago,
      preference_id: preferenceId,
      external_reference: String(externalRef),
    })
  } catch (err) {
    console.error('[MP preferencia]', err?.message || err, err?.cause)
    const msg = err?.message?.includes('MP_ACCESS_TOKEN')
      ? 'Falta configurar MP_ACCESS_TOKEN en el servidor'
      : 'No se pudo iniciar el pago. Intenta de nuevo.'
    return res.status(500).json({ mensaje: msg })
  }
})

router.get('/pedidos-establecimiento', verificarToken, async (req, res) => {
  try {
    const pool = await obtenerConexion()
    const rEst = await pool.query(
      'SELECT id FROM establecimientos WHERE usuario_id = $1',
      [req.usuarioId]
    )
    const estId = rEst.rows[0]?.id
    if (!estId) {
      return res.status(403).json({ mensaje: 'No tienes un establecimiento registrado' })
    }

    const r = await pool.query(
      `SELECT p.id, p.external_reference, p.estado, p.total, p.items_json, p.mp_payment_id, p.mp_status,
              p.creado_en, p.actualizado_en, u.nombre AS cliente_nombre, u.correo AS cliente_correo
       FROM pedidos p
       LEFT JOIN usuarios u ON p.cliente_id = u.id
       WHERE p.establecimiento_id = $1
       ORDER BY p.creado_en DESC
       LIMIT 100`,
      [estId]
    )

    const lista = r.rows.map((f) => ({
      id: f.id,
      external_reference: f.external_reference,
      estado: f.estado,
      total: Number(f.total),
      items: f.items_json,
      mp_payment_id: f.mp_payment_id,
      mp_status: f.mp_status,
      creado_en: f.creado_en,
      actualizado_en: f.actualizado_en,
      cliente_nombre: f.cliente_nombre,
      cliente_correo: f.cliente_correo,
    }))
    return res.json(lista)
  } catch (err) {
    console.error(err)
    res.status(500).json({ mensaje: 'Error al listar pedidos' })
  }
})

export default router
