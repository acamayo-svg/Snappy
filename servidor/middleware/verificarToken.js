import jwt from 'jsonwebtoken'

export function verificarToken(req, res, next) {
  const cabecera = req.headers.authorization
  const token = cabecera?.startsWith('Bearer ') ? cabecera.slice(7) : null

  if (!token) {
    return res.status(401).json({ mensaje: 'Token requerido' })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_CLAVE || 'snappy-clave-secreta')
    req.usuarioId = payload.id
    req.usuarioCorreo = payload.correo
    next()
  } catch {
    return res.status(401).json({ mensaje: 'Token inválido o expirado' })
  }
}
