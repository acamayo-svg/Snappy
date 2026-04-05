import { Router } from 'express'
import crypto from 'crypto'
import { obtenerConexion } from '../config/basedatos.js'
import { verificarToken } from '../middleware/verificarToken.js'
import { urlBaseServidor } from '../config/urlPublica.js'

const router = Router()

function urlFrontend() {
  const u = process.env.FRONTEND_URL?.trim().replace(/\/$/, '')
  if (u) return u
  return 'http://localhost:5173'
}

function wompiApiBase() {
  return (process.env.WOMPI_API_BASE || 'https://sandbox.wompi.co/v1').replace(/\/$/, '')
}

function wompiPublicKey() {
  const k = process.env.WOMPI_PUBLIC_KEY?.trim()
  if (!k) throw new Error('WOMPI_PUBLIC_KEY no configurado')
  return k
}

function wompiPrivateKey() {
  const k = process.env.WOMPI_PRIVATE_KEY?.trim()
  if (!k) throw new Error('WOMPI_PRIVATE_KEY no configurado')
  return k
}

function wompiIntegritySecret() {
  const k = process.env.WOMPI_INTEGRITY_SECRET?.trim()
  if (!k) throw new Error('WOMPI_INTEGRITY_SECRET no configurado')
  return k
}

/** Pesos COP (enteros) → centavos Wompi (doc: monto × 100). */
function montoACentavos(totalPesos) {
  return Math.max(0, Math.round(Number(totalPesos) * 100))
}

function firmaIntegridad(reference, amountInCents) {
  const cadena = `${reference}${amountInCents}COP${wompiIntegritySecret()}`
  return crypto.createHash('sha256').update(cadena, 'utf8').digest('hex')
}

function valorPorRuta(obj, ruta) {
  return ruta.split('.').reduce((o, k) => (o != null ? o[k] : undefined), obj)
}

function verificarFirmaEvento(body) {
  const secreto = process.env.WOMPI_EVENTS_SECRET?.trim()
  if (!secreto || !body?.signature?.properties || !body.timestamp) return true

  let cadena = ''
  for (const prop of body.signature.properties) {
    const v = valorPorRuta(body.data, prop)
    if (v === undefined || v === null) return false
    cadena += String(v)
  }
  cadena += String(body.timestamp)
  cadena += secreto
  const hex = crypto.createHash('sha256').update(cadena, 'utf8').digest('hex').toUpperCase()
  const esperado = (body.signature.checksum || '').toUpperCase()
  return hex === esperado
}

async function fetchTransaccionWompi(id) {
  const url = `${wompiApiBase()}/transactions/${encodeURIComponent(id)}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${wompiPrivateKey()}`, Accept: 'application/json' },
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(
      json?.error?.message ||
        json?.error?.reason?.[0] ||
        json?.message ||
        'Error consultando transacción Wompi'
    )
  }
  const raw = json?.data ?? json
  if (raw && typeof raw === 'object' && raw.reference == null && raw.transaction) {
    return raw.transaction
  }
  return raw
}

async function actualizarPedidoDesdeTransaccion(pool, tx) {
  const ref = tx?.reference
  if (!ref) return null

  const st = String(tx.status || '').toUpperCase()
  let nuevoEstado = null
  if (st === 'APPROVED') nuevoEstado = 'pagado'
  else if (['DECLINED', 'VOIDED', 'ERROR'].includes(st)) nuevoEstado = 'rechazado'
  else nuevoEstado = 'pendiente_wompi'

  const tid = tx.id != null ? String(tx.id) : null

  await pool.query(
    `UPDATE pedidos
     SET estado = COALESCE($1::text, estado),
         wompi_transaction_id = COALESCE($2, wompi_transaction_id),
         wompi_status = $3,
         actualizado_en = NOW()
     WHERE external_reference = $4`,
    [nuevoEstado, tid, st || null, String(ref)]
  )

  const r = await pool.query(
    `SELECT id, external_reference, estado, total, items_json, wompi_transaction_id, wompi_status,
            establecimiento_id, creado_en
     FROM pedidos WHERE external_reference = $1`,
    [String(ref)]
  )
  return r.rows[0] ?? null
}

/** Webhook eventos Wompi (configurar en dashboard: URL de eventos). */
router.post('/eventos', async (req, res) => {
  try {
    const body = req.body
    if (!body || typeof body !== 'object') {
      return res.status(400).send('bad request')
    }

    if (process.env.WOMPI_EVENTS_SECRET?.trim() && !verificarFirmaEvento(body)) {
      console.warn('[Wompi] Firma de evento inválida')
      return res.status(401).send('invalid signature')
    }

    if (body.event === 'transaction.updated' && body.data?.transaction) {
      const pool = await obtenerConexion()
      await actualizarPedidoDesdeTransaccion(pool, body.data.transaction)
    }

    return res.status(200).send('ok')
  } catch (err) {
    console.error('[Wompi eventos]', err?.message || err)
    return res.status(500).send('error')
  }
})

router.get('/sincronizar', async (req, res) => {
  try {
    const id = req.query.id
    let ref = req.query.reference || req.query.external_reference
    if (!id) {
      return res.status(400).json({ mensaje: 'Falta id de transacción' })
    }

    const tx = await fetchTransaccionWompi(String(id))
    if (!tx?.reference) {
      return res.status(502).json({ mensaje: 'Respuesta Wompi sin referencia' })
    }
    if (ref && String(tx.reference) !== String(ref)) {
      return res.status(400).json({ mensaje: 'La referencia no coincide con la transacción' })
    }
    ref = tx.reference

    const pool = await obtenerConexion()
    const existe = await pool.query(
      'SELECT id FROM pedidos WHERE external_reference = $1',
      [String(ref)]
    )
    if (existe.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Pedido no encontrado' })
    }

    const fila = await actualizarPedidoDesdeTransaccion(pool, tx)
    return res.json({
      ok: true,
      pedido: fila
        ? {
            id: fila.id,
            external_reference: fila.external_reference,
            estado: fila.estado,
            total: Number(fila.total),
            items: fila.items_json,
            transaction_id: fila.wompi_transaction_id,
            wompi_status: fila.wompi_status,
          }
        : null,
    })
  } catch (err) {
    console.error('[Wompi sincronizar]', err?.message || err)
    return res.status(500).json({ mensaje: err?.message || 'No se pudo confirmar el pago' })
  }
})

router.get('/comprobante/:externalReference', async (req, res) => {
  try {
    const { externalReference } = req.params
    const pool = await obtenerConexion()
    const r = await pool.query(
      `SELECT p.id, p.external_reference, p.estado, p.total, p.items_json, p.wompi_transaction_id, p.wompi_status,
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
      transaction_id: f.wompi_transaction_id,
      wompi_status: f.wompi_status,
      establecimiento_nombre: f.establecimiento_nombre,
      creado_en: f.creado_en,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ mensaje: 'Error al obtener comprobante' })
  }
})

/** Crea pedido + datos para WidgetCheckout Wompi (firma en servidor). */
router.post('/preparar', verificarToken, async (req, res) => {
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

    let total = 0
    const itemsGuardar = []

    for (const linea of lineasCliente) {
      const prod = porId.get(String(linea.id))
      if (!prod) continue
      const cant = Math.max(1, parseInt(String(linea.cantidad), 10) || 1)
      const unit = Math.max(0, Math.round(Number(prod.precio)))
      const sub = unit * cant
      total += sub
      itemsGuardar.push({
        producto_id: String(prod.id),
        nombre: prod.nombre,
        cantidad: cant,
        precio_unitario: unit,
      })
    }

    if (itemsGuardar.length === 0 || total <= 0) {
      return res.status(400).json({ mensaje: 'Total inválido' })
    }

    const amountInCents = montoACentavos(total)

    const insertPedido = await pool.query(
      `INSERT INTO pedidos (
        establecimiento_id, cliente_id, external_reference, estado, total, items_json
      ) VALUES ($1, $2, gen_random_uuid()::text, 'esperando_pago', $3, $4::jsonb)
      RETURNING id, external_reference`,
      [establecimientoId, req.usuarioId, total, JSON.stringify(itemsGuardar)]
    )

    const { external_reference: externalRef } = insertPedido.rows[0]
    const refStr = String(externalRef)
    const firma = firmaIntegridad(refStr, amountInCents)
    const redirectUrl = `${urlFrontend()}/pago/wompi/resultado`

    return res.json({
      publicKey: wompiPublicKey(),
      currency: 'COP',
      amountInCents,
      reference: refStr,
      signatureIntegrity: firma,
      redirectUrl,
    })
  } catch (err) {
    console.error('[Wompi preparar]', err?.message || err)
    const msg =
      err?.message?.includes('WOMPI_')
        ? 'Faltan variables WOMPI_* en el servidor'
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
      `SELECT p.id, p.external_reference, p.estado, p.total, p.items_json, p.wompi_transaction_id, p.wompi_status,
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
      transaction_id: f.wompi_transaction_id,
      wompi_status: f.wompi_status,
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
