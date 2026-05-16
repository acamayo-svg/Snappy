import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { obtenerConexion } from '../config/basedatos.js'
import { obtenerClienteSupabaseServidor } from '../lib/supabaseServidor.js'

async function resolverUsuarioDesdeSupabase(req, res, next, token) {
  try {
    const sb = obtenerClienteSupabaseServidor()
    if (!sb) {
      return res.status(401).json({ mensaje: 'Token inválido o expirado' })
    }

    const {
      data: { user },
      error,
    } = await sb.auth.getUser(token)

    if (error || !user?.id) {
      return res.status(401).json({ mensaje: 'Token inválido o expirado' })
    }

    const authId = user.id
    const email = (user.email || '').toLowerCase().trim()
    const meta = user.user_metadata || {}
    const nombre =
      String(meta.nombre_display || meta.full_name || meta.name || meta.nickname || '').trim() ||
      (email ? email.split('@')[0] : '') ||
      'Usuario'

    const pool = await obtenerConexion()

    const porSupabase = await pool.query('SELECT id, correo FROM usuarios WHERE supabase_auth_id = $1', [
      authId,
    ])
    if (porSupabase.rows.length > 0) {
      req.usuarioId = porSupabase.rows[0].id
      req.usuarioCorreo = porSupabase.rows[0].correo
      return next()
    }

    if (!email) {
      return res.status(403).json({
        mensaje: 'La cuenta no tiene correo verificado. Completa el registro con correo u otro proveedor.',
      })
    }

    const porCorreo = await pool.query(
      'SELECT id, correo, supabase_auth_id FROM usuarios WHERE correo = $1',
      [email]
    )
    if (porCorreo.rows.length > 0) {
      const row = porCorreo.rows[0]
      if (row.supabase_auth_id && row.supabase_auth_id !== authId) {
        return res.status(403).json({
          mensaje: 'Este correo ya está asociado a otra cuenta.',
        })
      }
      await pool.query('UPDATE usuarios SET supabase_auth_id = $1 WHERE id = $2', [authId, row.id])
      req.usuarioId = row.id
      req.usuarioCorreo = row.correo
      return next()
    }

    const contrasenaHash = bcrypt.hashSync(`SUPABASE|${authId}|${Date.now()}`, 10)
    const ins = await pool.query(
      `INSERT INTO usuarios (correo, contrasena_hash, nombre, roles, supabase_auth_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, correo`,
      [email, contrasenaHash, nombre, ['cliente'], authId]
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
    // No es JWT legado de la app; validar Supabase
  }

  void resolverUsuarioDesdeSupabase(req, res, next, token)
}
