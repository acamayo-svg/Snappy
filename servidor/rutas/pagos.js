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
  const tid = tx.id != null ? String(tx.id) : null

  const cur = await pool.query('SELECT estado FROM pedidos WHERE external_reference = $1', [String(ref)])
  const estadoActual = cur.rows[0]?.estado
  if (!estadoActual) return null

  const fasePago = ['esperando_pago', 'pendiente_wompi'].includes(estadoActual)
  let nuevoEstado = estadoActual
  if (st === 'APPROVED' && fasePago) nuevoEstado = 'pagado'
  else if (['DECLINED', 'VOIDED', 'ERROR'].includes(st) && fasePago) nuevoEstado = 'rechazado'
  else if (fasePago) nuevoEstado = 'pendiente_wompi'

  await pool.query(
    `UPDATE pedidos
     SET estado = $1,
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

async function usuarioTieneRol(pool, usuarioId, rol) {
  const r = await pool.query(`SELECT 1 FROM usuarios WHERE id = $1 AND $2 = ANY(roles)`, [usuarioId, rol])
  return r.rows.length > 0
}

async function idDomiciliarioDeUsuario(pool, usuarioId) {
  const r = await pool.query('SELECT id FROM domiciliarios WHERE usuario_id = $1', [usuarioId])
  return r.rows[0]?.id ?? null
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
              p.creado_en, p.envio_direccion, p.envio_telefono, p.envio_nota,
              e.nombre_negocio AS establecimiento_nombre
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
      envio: {
        direccion: f.envio_direccion || '',
        telefono: f.envio_telefono || '',
        nota: f.envio_nota || '',
      },
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

    const bodyEnvio = req.body?.envio
    let envDir = String(bodyEnvio?.direccion ?? '').trim()
    let envTel = String(bodyEnvio?.telefono ?? '').trim()
    const notaExplicita = bodyEnvio != null && Object.prototype.hasOwnProperty.call(bodyEnvio, 'nota')
    let envNota = notaExplicita ? String(bodyEnvio.nota ?? '').trim() || null : null

    const u = await pool.query(
      'SELECT envio_direccion, envio_telefono, envio_nota FROM usuarios WHERE id = $1',
      [req.usuarioId]
    )
    const uf = u.rows[0]
    if (!envDir) envDir = String(uf?.envio_direccion ?? '').trim()
    if (!envTel) envTel = String(uf?.envio_telefono ?? '').trim()
    if (!notaExplicita) {
      envNota = String(uf?.envio_nota ?? '').trim() || null
    }

    if (!envDir || !envTel) {
      return res.status(400).json({
        mensaje:
          'Completa dirección y teléfono de envío antes de pagar. Puedes guardarlos en Mi cuenta o indicarlos al pagar.',
      })
    }

    if (req.body?.guardar_envio_en_perfil) {
      await pool.query(
        `UPDATE usuarios SET envio_direccion = $1, envio_telefono = $2, envio_nota = $3 WHERE id = $4`,
        [envDir, envTel, envNota, req.usuarioId]
      )
    }

    const amountInCents = montoACentavos(total)

    const insertPedido = await pool.query(
      `INSERT INTO pedidos (
        establecimiento_id, cliente_id, external_reference, estado, total, items_json,
        envio_direccion, envio_telefono, envio_nota
      ) VALUES ($1, $2, gen_random_uuid()::text, 'esperando_pago', $3, $4::jsonb, $5, $6, $7)
      RETURNING id, external_reference`,
      [
        establecimientoId,
        req.usuarioId,
        total,
        JSON.stringify(itemsGuardar),
        envDir,
        envTel,
        envNota,
      ]
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
              p.creado_en, p.actualizado_en, p.envio_direccion, p.envio_telefono, p.envio_nota,
              p.domiciliario_id, p.asignado_domiciliario_en, p.en_camino_en, p.entregado_en,
              u.nombre AS cliente_nombre, u.correo AS cliente_correo,
              ud.nombre AS domiciliario_nombre, ud.correo AS domiciliario_correo
       FROM pedidos p
       LEFT JOIN usuarios u ON p.cliente_id = u.id
       LEFT JOIN domiciliarios dom ON p.domiciliario_id = dom.id
       LEFT JOIN usuarios ud ON dom.usuario_id = ud.id
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
      envio: {
        direccion: f.envio_direccion || '',
        telefono: f.envio_telefono || '',
        nota: f.envio_nota || '',
      },
      domiciliario_id: f.domiciliario_id,
      domiciliario_nombre: f.domiciliario_nombre,
      domiciliario_correo: f.domiciliario_correo,
      asignado_domiciliario_en: f.asignado_domiciliario_en,
      en_camino_en: f.en_camino_en,
      entregado_en: f.entregado_en,
    }))
    return res.json(lista)
  } catch (err) {
    console.error(err)
    res.status(500).json({ mensaje: 'Error al listar pedidos' })
  }
})

/** Avanza estado operativo del pedido (solo establecimiento dueño). */
router.patch('/establecimiento/pedidos/:pedidoId', verificarToken, async (req, res) => {
  try {
    const pool = await obtenerConexion()
    if (!(await usuarioTieneRol(pool, req.usuarioId, 'establecimiento'))) {
      return res.status(403).json({ mensaje: 'Solo un establecimiento puede actualizar este pedido' })
    }

    const rEst = await pool.query('SELECT id FROM establecimientos WHERE usuario_id = $1', [req.usuarioId])
    const estId = rEst.rows[0]?.id
    if (!estId) return res.status(403).json({ mensaje: 'No tienes un establecimiento registrado' })

    const pedidoId = String(req.params.pedidoId || '')
    const siguiente = String(req.body?.siguiente || '').trim()

    const ped = await pool.query(
      `SELECT id, estado FROM pedidos WHERE id = $1::uuid AND establecimiento_id = $2`,
      [pedidoId, estId]
    )
    if (ped.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Pedido no encontrado' })
    }
    const estadoActual = ped.rows[0].estado

    let nuevoEstado = null
    if (siguiente === 'en_preparacion' && estadoActual === 'pagado') nuevoEstado = 'en_preparacion'
    else if (siguiente === 'listo_reparto' && estadoActual === 'en_preparacion') nuevoEstado = 'listo_reparto'

    if (!nuevoEstado) {
      return res.status(400).json({
        mensaje: 'Transición no válida. Desde Pagado → en preparación; desde En preparación → listo para reparto.',
      })
    }

    const up = await pool.query(
      `UPDATE pedidos SET estado = $1, actualizado_en = NOW() WHERE id = $2::uuid AND establecimiento_id = $3
       RETURNING id, external_reference, estado, total, items_json, envio_direccion, envio_telefono, envio_nota,
                 domiciliario_id, asignado_domiciliario_en, en_camino_en, entregado_en, creado_en, actualizado_en`,
      [nuevoEstado, pedidoId, estId]
    )
    const f = up.rows[0]
    return res.json({
      id: f.id,
      external_reference: f.external_reference,
      estado: f.estado,
      total: Number(f.total),
      items: f.items_json,
      envio: {
        direccion: f.envio_direccion || '',
        telefono: f.envio_telefono || '',
        nota: f.envio_nota || '',
      },
      domiciliario_id: f.domiciliario_id,
      creado_en: f.creado_en,
      actualizado_en: f.actualizado_en,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ mensaje: 'Error al actualizar el pedido' })
  }
})

/** Pedidos para reparto: disponibles y asignados al domiciliario autenticado. */
router.get('/domiciliario/pedidos', verificarToken, async (req, res) => {
  try {
    const pool = await obtenerConexion()
    if (!(await usuarioTieneRol(pool, req.usuarioId, 'domiciliario'))) {
      return res.status(403).json({ mensaje: 'Solo domiciliarios pueden ver esta lista' })
    }
    const domId = await idDomiciliarioDeUsuario(pool, req.usuarioId)
    if (!domId) {
      return res.status(403).json({ mensaje: 'No tienes perfil de domiciliario activo' })
    }

    const disponibles = await pool.query(
      `SELECT p.id, p.external_reference, p.estado, p.total, p.items_json, p.creado_en, p.actualizado_en,
              p.envio_direccion, p.envio_telefono, p.envio_nota,
              e.nombre_negocio, e.direccion AS establecimiento_direccion, e.telefono AS establecimiento_telefono,
              u.nombre AS cliente_nombre
       FROM pedidos p
       JOIN establecimientos e ON p.establecimiento_id = e.id
       LEFT JOIN usuarios u ON p.cliente_id = u.id
       WHERE p.estado = 'listo_reparto' AND p.domiciliario_id IS NULL
       ORDER BY p.actualizado_en ASC
       LIMIT 50`
    )

    const mios = await pool.query(
      `SELECT p.id, p.external_reference, p.estado, p.total, p.items_json, p.creado_en, p.actualizado_en,
              p.envio_direccion, p.envio_telefono, p.envio_nota,
              p.asignado_domiciliario_en, p.en_camino_en, p.entregado_en,
              e.nombre_negocio, e.direccion AS establecimiento_direccion, e.telefono AS establecimiento_telefono,
              u.nombre AS cliente_nombre
       FROM pedidos p
       JOIN establecimientos e ON p.establecimiento_id = e.id
       LEFT JOIN usuarios u ON p.cliente_id = u.id
       WHERE p.domiciliario_id = $1 AND p.estado IN ('listo_reparto', 'en_camino')
       ORDER BY p.asignado_domiciliario_en DESC NULLS LAST
       LIMIT 30`,
      [domId]
    )

    const mapPed = (f) => ({
      id: f.id,
      external_reference: f.external_reference,
      estado: f.estado,
      total: Number(f.total),
      items: f.items_json,
      creado_en: f.creado_en,
      actualizado_en: f.actualizado_en,
      envio: {
        direccion: f.envio_direccion || '',
        telefono: f.envio_telefono || '',
        nota: f.envio_nota || '',
      },
      establecimiento_nombre: f.nombre_negocio,
      establecimiento_direccion: f.establecimiento_direccion,
      establecimiento_telefono: f.establecimiento_telefono,
      cliente_nombre: f.cliente_nombre,
      asignado_domiciliario_en: f.asignado_domiciliario_en,
      en_camino_en: f.en_camino_en,
      entregado_en: f.entregado_en,
    })

    return res.json({
      disponibles: disponibles.rows.map(mapPed),
      mis_pedidos: mios.rows.map(mapPed),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ mensaje: 'Error al listar pedidos de reparto' })
  }
})

router.post('/domiciliario/pedidos/:pedidoId/reclamar', verificarToken, async (req, res) => {
  try {
    const pool = await obtenerConexion()
    if (!(await usuarioTieneRol(pool, req.usuarioId, 'domiciliario'))) {
      return res.status(403).json({ mensaje: 'Solo domiciliarios pueden reclamar pedidos' })
    }
    const domId = await idDomiciliarioDeUsuario(pool, req.usuarioId)
    if (!domId) return res.status(403).json({ mensaje: 'No tienes perfil de domiciliario activo' })

    const pedidoId = String(req.params.pedidoId || '')
    const up = await pool.query(
      `UPDATE pedidos
       SET domiciliario_id = $1, asignado_domiciliario_en = NOW(), actualizado_en = NOW()
       WHERE id = $2::uuid AND estado = 'listo_reparto' AND domiciliario_id IS NULL
       RETURNING id, external_reference, estado`,
      [domId, pedidoId]
    )
    if (up.rows.length === 0) {
      return res.status(409).json({
        mensaje: 'El pedido no está disponible (otro repartidor lo tomó o aún no está listo).',
      })
    }
    return res.json({ ok: true, pedido: up.rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ mensaje: 'Error al reclamar el pedido' })
  }
})

router.post('/domiciliario/pedidos/:pedidoId/en-camino', verificarToken, async (req, res) => {
  try {
    const pool = await obtenerConexion()
    if (!(await usuarioTieneRol(pool, req.usuarioId, 'domiciliario'))) {
      return res.status(403).json({ mensaje: 'Solo domiciliarios' })
    }
    const domId = await idDomiciliarioDeUsuario(pool, req.usuarioId)
    if (!domId) return res.status(403).json({ mensaje: 'No tienes perfil de domiciliario activo' })

    const pedidoId = String(req.params.pedidoId || '')
    const up = await pool.query(
      `UPDATE pedidos
       SET estado = 'en_camino', en_camino_en = NOW(), actualizado_en = NOW()
       WHERE id = $1::uuid AND domiciliario_id = $2 AND estado = 'listo_reparto'
       RETURNING id, external_reference, estado`,
      [pedidoId, domId]
    )
    if (up.rows.length === 0) {
      return res.status(400).json({ mensaje: 'No puedes marcar en camino este pedido.' })
    }
    return res.json({ ok: true, pedido: up.rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ mensaje: 'Error al actualizar el pedido' })
  }
})

router.post('/domiciliario/pedidos/:pedidoId/entregado', verificarToken, async (req, res) => {
  try {
    const pool = await obtenerConexion()
    if (!(await usuarioTieneRol(pool, req.usuarioId, 'domiciliario'))) {
      return res.status(403).json({ mensaje: 'Solo domiciliarios' })
    }
    const domId = await idDomiciliarioDeUsuario(pool, req.usuarioId)
    if (!domId) return res.status(403).json({ mensaje: 'No tienes perfil de domiciliario activo' })

    const pedidoId = String(req.params.pedidoId || '')
    const up = await pool.query(
      `UPDATE pedidos
       SET estado = 'entregado', entregado_en = NOW(), actualizado_en = NOW()
       WHERE id = $1::uuid AND domiciliario_id = $2 AND estado = 'en_camino'
       RETURNING id, external_reference, estado, entregado_en`,
      [pedidoId, domId]
    )
    if (up.rows.length === 0) {
      return res.status(400).json({ mensaje: 'Solo puedes marcar entregado un pedido tuyo en camino.' })
    }
    return res.json({ ok: true, pedido: up.rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ mensaje: 'Error al marcar entregado' })
  }
})

export default router
