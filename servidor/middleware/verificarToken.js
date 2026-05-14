import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { auth } from 'express-oauth2-jwt-bearer'
import { obtenerConexion } from '../config/basedatos.js'

/** `undefined` = aún no calculado; `null` = Auth0 no configurado; función = middleware JWT Auth0 */
let middlewareAuth0Memo

function obtenerMiddlewareAuth0() {
  if (middlewareAuth0Memo !== undefined) {
    return middlewareAuth0Memo
  }

  const issuerBase =
    process.env.AUTH0_ISSUER_BASE_URL ||
    (process.env.AUTH0_DOMAIN
      ? `https://${String(process.env.AUTH0_DOMAIN).replace(/^https?:\/\//, '').replace(/\/$/, '')}`
      : '')
  const audience = process.env.AUTH0_AUDIENCE

  if (!issuerBase || !audience) {
    middlewareAuth0Memo = null
    return null
  }

  middlewareAuth0Memo = auth({
    issuerBaseURL: issuerBase,
    audience,
  })
  return middlewareAuth0Memo
}

async function resolverUsuarioDesdeAuth0(req, res, next) {
  try {
    const pool = await obtenerConexion()
    const payload = req.auth?.payload
    if (!payload?.sub) {
      return res.status(401).json({ mensaje: 'Token sin identificador de usuario' })
    }

    const sub = String(payload.sub)
    const namespace = String(process.env.AUTH0_CLAIM_NAMESPACE || 'https://snappy.app').replace(/\/$/, '')
    const reclamoEmail = `${namespace}/email`
    const reclamoNombre = `${namespace}/name`

    const emailRaw =
      (typeof payload[reclamoEmail] === 'string' && payload[reclamoEmail]) ||
      (typeof payload.email === 'string' && payload.email) ||
      ''
    const email = emailRaw.toLowerCase().trim()

    const nombreFuente =
      (typeof payload[reclamoNombre] === 'string' && payload[reclamoNombre]) ||
      (typeof payload.name === 'string' && payload.name) ||
      (typeof payload.nickname === 'string' && payload.nickname) ||
      (email ? email.split('@')[0] : '') ||
      'Usuario'
    const nombre = String(nombreFuente).trim() || 'Usuario'

    const existSub = await pool.query('SELECT id, correo FROM usuarios WHERE auth0_sub = $1', [sub])
    if (existSub.rows.length > 0) {
      req.usuarioId = existSub.rows[0].id
      req.usuarioCorreo = existSub.rows[0].correo
      return next()
    }

    if (!email) {
      return res.status(403).json({
        mensaje:
          `El token no incluye correo. En Auth0, agrega una Action Post-Login que incluya en el access token el claim "${reclamoEmail}" (o usa el claim estándar email si tu API lo permite).`,
      })
    }

    const porCorreo = await pool.query(
      'SELECT id, correo, auth0_sub FROM usuarios WHERE correo = $1',
      [email]
    )
    if (porCorreo.rows.length > 0) {
      const row = porCorreo.rows[0]
      if (row.auth0_sub && row.auth0_sub !== sub) {
        return res.status(403).json({
          mensaje: 'Este correo ya está asociado a otra cuenta de acceso.',
        })
      }
      await pool.query('UPDATE usuarios SET auth0_sub = $1 WHERE id = $2', [sub, row.id])
      req.usuarioId = row.id
      req.usuarioCorreo = row.correo
      return next()
    }

    const contrasenaHash = bcrypt.hashSync(`AUTH0|${sub}|${Date.now()}`, 10)
    const ins = await pool.query(
      `INSERT INTO usuarios (correo, contrasena_hash, nombre, roles, auth0_sub)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, correo`,
      [email, contrasenaHash, nombre, ['cliente'], sub]
    )
    req.usuarioId = ins.rows[0].id
    req.usuarioCorreo = ins.rows[0].correo
    return next()
  } catch (err) {
    console.error(err)
    return res.status(500).json({ mensaje: 'Error al vincular la sesión con la cuenta' })
  }
}

export function verificarToken(req, res, next) {
  const cabecera = req.headers.authorization
  const token = cabecera?.startsWith('Bearer ') ? cabecera.slice(7) : null

  if (!token) {
    return res.status(401).json({ mensaje: 'Token requerido' })
  }

  const claveJwt = process.env.JWT_CLAVE || 'snappy-clave-secreta'
  try {
    const payload = jwt.verify(token, claveJwt)
    if (payload?.id) {
      req.usuarioId = payload.id
      req.usuarioCorreo = payload.correo
      return next()
    }
  } catch {
    // No es JWT de la app; intentar Auth0
  }

  const checkJwt = obtenerMiddlewareAuth0()
  if (!checkJwt) {
    return res.status(401).json({ mensaje: 'Token inválido o expirado' })
  }

  checkJwt(req, res, (err) => {
    if (err) {
      return res.status(401).json({ mensaje: 'Token inválido o expirado' })
    }
    void resolverUsuarioDesdeAuth0(req, res, next)
  })
}
