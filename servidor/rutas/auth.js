import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { obtenerConexion } from '../config/basedatos.js'
import { verificarToken } from '../middleware/verificarToken.js'

const router = Router()

function generarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, correo: usuario.correo },
    process.env.JWT_CLAVE || 'snappy-clave-secreta',
    { expiresIn: '24h' }
  )
}

function usuarioARespuesta(fila) {
  const roles = Array.isArray(fila.roles) ? fila.roles : [fila.rol || 'cliente'].filter(Boolean)
  return {
    id: fila.id,
    email: fila.correo,
    nombre: fila.nombre,
    roles,
  }
}

router.post('/login', async (req, res) => {
  try {
    const { email, contraseña } = req.body
    if (!email || !email.trim()) {
      return res.status(400).json({ mensaje: 'El correo es obligatorio' })
    }

    const pool = await obtenerConexion()
    const resultado = await pool.query(
      'SELECT id, correo, nombre, roles, contrasena_hash FROM usuarios WHERE correo = $1',
      [email.trim().toLowerCase()]
    )

    const fila = resultado.rows[0]
    if (!fila || !bcrypt.compareSync(contraseña || '', fila.contrasena_hash)) {
      return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos' })
    }

    const token = generarToken(fila)
    res.json({
      token,
      usuario: usuarioARespuesta(fila),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ mensaje: 'Error al iniciar sesión' })
  }
})

router.post('/registro', async (req, res) => {
  try {
    const { correo, contrasena, nombre } = req.body
    if (!correo?.trim()) return res.status(400).json({ mensaje: 'El correo es obligatorio' })
    if (!contrasena || contrasena.length < 6) {
      return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 6 caracteres' })
    }
    if (!nombre?.trim()) return res.status(400).json({ mensaje: 'El nombre es obligatorio' })

    const pool = await obtenerConexion()
    const existe = await pool.query('SELECT 1 FROM usuarios WHERE correo = $1', [
      correo.trim().toLowerCase(),
    ])
    if (existe.rows.length > 0) {
      return res.status(400).json({ mensaje: 'Ya existe una cuenta con ese correo' })
    }

    const contrasenaHash = bcrypt.hashSync(contrasena, 10)
    const nombreFinal = nombre.trim() || correo.split('@')[0]

    const insertado = await pool.query(
      `INSERT INTO usuarios (correo, contrasena_hash, nombre, roles)
       VALUES ($1, $2, $3, $4)
       RETURNING id, correo, nombre, roles`,
      [correo.trim().toLowerCase(), contrasenaHash, nombreFinal, ['cliente']]
    )

    const fila = insertado.rows[0]
    const token = generarToken(fila)
    res.status(200).json({
      token,
      usuario: usuarioARespuesta(fila),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ mensaje: 'Error al registrarse' })
  }
})

router.get('/tipos-establecimiento', async (_req, res) => {
  try {
    const pool = await obtenerConexion()
    const resultado = await pool.query(
      'SELECT id, clave, nombre FROM tipos_establecimiento ORDER BY nombre'
    )
    res.json(resultado.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ mensaje: 'Error al obtener tipos de establecimiento' })
  }
})

router.post('/registrar-negocio', verificarToken, async (req, res) => {
  try {
    const { nombre_negocio, direccion, telefono, tipo_establecimiento } = req.body
    if (!nombre_negocio?.trim()) {
      return res.status(400).json({ mensaje: 'El nombre del negocio es obligatorio' })
    }
    const claveTipo = (tipo_establecimiento || '').trim().toLowerCase()
    if (!claveTipo || !['comida', 'tienda'].includes(claveTipo)) {
      return res.status(400).json({
        mensaje: 'Debes elegir el tipo de negocio: comida o tienda (otros productos)',
      })
    }

    const pool = await obtenerConexion()
    const tipoRow = await pool.query(
      'SELECT id FROM tipos_establecimiento WHERE clave = $1',
      [claveTipo]
    )
    if (tipoRow.rows.length === 0) {
      return res.status(400).json({ mensaje: 'Tipo de establecimiento no válido' })
    }
    const tipoId = tipoRow.rows[0].id

    const yaTiene = await pool.query('SELECT 1 FROM establecimientos WHERE usuario_id = $1', [
      req.usuarioId,
    ])
    if (yaTiene.rows.length > 0) {
      return res.status(400).json({ mensaje: 'Ya tienes un negocio registrado' })
    }

    await pool.query(
      `INSERT INTO establecimientos (usuario_id, tipo_id, nombre_negocio, direccion, telefono)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.usuarioId, tipoId, nombre_negocio.trim(), (direccion || '').trim(), (telefono || '').trim()]
    )

    await pool.query(
      `UPDATE usuarios SET roles = array_append(roles, 'establecimiento')
       WHERE id = $1 AND NOT ('establecimiento' = ANY(roles))`,
      [req.usuarioId]
    )

    const usuario = await pool.query(
      'SELECT id, correo, nombre, roles FROM usuarios WHERE id = $1',
      [req.usuarioId]
    )
    res.status(200).json({
      mensaje: 'Negocio registrado correctamente',
      usuario: usuarioARespuesta(usuario.rows[0]),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ mensaje: 'Error al registrar el negocio' })
  }
})

router.post('/ser-domiciliario', verificarToken, async (req, res) => {
  try {
    const pool = await obtenerConexion()
    const yaTiene = await pool.query('SELECT 1 FROM domiciliarios WHERE usuario_id = $1', [
      req.usuarioId,
    ])
    if (yaTiene.rows.length > 0) {
      return res.status(400).json({ mensaje: 'Ya estás registrado como domiciliario' })
    }

    await pool.query(
      'INSERT INTO domiciliarios (usuario_id) VALUES ($1)',
      [req.usuarioId]
    )

    await pool.query(
      `UPDATE usuarios SET roles = array_append(roles, 'domiciliario')
       WHERE id = $1 AND NOT ('domiciliario' = ANY(roles))`,
      [req.usuarioId]
    )

    const usuario = await pool.query(
      'SELECT id, correo, nombre, roles FROM usuarios WHERE id = $1',
      [req.usuarioId]
    )
    res.status(200).json({
      mensaje: 'Te has registrado como domiciliario',
      usuario: usuarioARespuesta(usuario.rows[0]),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ mensaje: 'Error al registrarte como domiciliario' })
  }
})

router.get('/yo', verificarToken, async (req, res) => {
  try {
    const pool = await obtenerConexion()
    const resultado = await pool.query(
      'SELECT id, correo, nombre, roles FROM usuarios WHERE id = $1',
      [req.usuarioId]
    )
    const fila = resultado.rows[0]
    if (!fila) return res.status(404).json({ mensaje: 'Usuario no encontrado' })

    const establecimiento = await pool.query(
      `SELECT e.id, e.nombre_negocio, e.direccion, e.telefono, t.clave AS tipo_clave, t.nombre AS tipo_nombre
       FROM establecimientos e
       JOIN tipos_establecimiento t ON e.tipo_id = t.id
       WHERE e.usuario_id = $1`,
      [req.usuarioId]
    )
    const domiciliario = await pool.query(
      'SELECT id, estado FROM domiciliarios WHERE usuario_id = $1',
      [req.usuarioId]
    )

    res.json({
      usuario: usuarioARespuesta(fila),
      establecimiento: establecimiento.rows[0] || null,
      domiciliario: domiciliario.rows[0] || null,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ mensaje: 'Error al obtener datos' })
  }
})

export default router
