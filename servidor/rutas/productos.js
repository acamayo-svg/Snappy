import { Router } from 'express'
import { obtenerConexion } from '../config/basedatos.js'
import { verificarToken } from '../middleware/verificarToken.js'
import { subirImagenProducto, subirImagenProductoMemoria, TAMANO_MAXIMO_IMAGEN_MB } from '../middleware/subirImagen.js'
import { subirImagenCloudinary, estaConfiguradoCloudinary } from '../config/cloudinary.js'

const router = Router()

/** Obtener establecimiento_id del usuario autenticado (solo si tiene rol establecimiento) */
async function obtenerEstablecimientoId(pool, usuarioId) {
  const r = await pool.query(
    'SELECT id FROM establecimientos WHERE usuario_id = $1',
    [usuarioId]
  )
  return r.rows[0]?.id ?? null
}

/** Listar productos (público). Opcional: ?establecimiento_id=UUID para filtrar por tienda */
router.get('/', async (req, res) => {
  try {
    const pool = await obtenerConexion()
    const { establecimiento_id } = req.query

    let query = `
      SELECT p.id, p.nombre, p.descripcion, p.precio, p.imagen, p.creado_en,
             p.establecimiento_id, e.nombre_negocio AS establecimiento_nombre,
             t.nombre AS tipo_nombre, t.clave AS tipo_clave
      FROM productos p
      JOIN establecimientos e ON p.establecimiento_id = e.id
      JOIN tipos_establecimiento t ON e.tipo_id = t.id
    `
    const params = []
    if (establecimiento_id) {
      params.push(establecimiento_id)
      query += ` WHERE p.establecimiento_id = $${params.length}`
    }
    query += ' ORDER BY p.creado_en DESC'

    const resultado = await pool.query(query, params)
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    const productos = resultado.rows.map((f) => ({
      id: f.id,
      nombre: f.nombre,
      descripcion: f.descripcion || '',
      precio: Number(f.precio),
      imagen: f.imagen || null,
      establecimiento_id: f.establecimiento_id,
      establecimiento: f.establecimiento_nombre,
      tipo_nombre: f.tipo_nombre,
      tipo_clave: f.tipo_clave,
      creado_en: f.creado_en,
    }))
    res.json(productos)
  } catch (err) {
    console.error(err)
    res.status(500).json({ mensaje: 'Error al listar productos' })
  }
})

/** Listar mis productos (establecimiento autenticado) */
router.get('/mis-productos', verificarToken, async (req, res) => {
  try {
    const pool = await obtenerConexion()
    const establecimientoId = await obtenerEstablecimientoId(pool, req.usuarioId)
    if (!establecimientoId) {
      return res.status(403).json({ mensaje: 'No tienes un establecimiento registrado' })
    }

    const resultado = await pool.query(
      `SELECT id, nombre, descripcion, precio, imagen, creado_en
       FROM productos
       WHERE establecimiento_id = $1
       ORDER BY creado_en DESC`,
      [establecimientoId]
    )
    const productos = resultado.rows.map((f) => ({
      id: f.id,
      nombre: f.nombre,
      descripcion: f.descripcion || '',
      precio: Number(f.precio),
      imagen: f.imagen || null,
      creado_en: f.creado_en,
    }))
    res.json(productos)
  } catch (err) {
    console.error(err)
    res.status(500).json({ mensaje: 'Error al listar tus productos' })
  }
})

/** Subir imagen de producto. Si Cloudinary está configurado, sube ahí; si no, guarda en disco/local. */
const middlewareSubirImagen = estaConfiguradoCloudinary()
  ? subirImagenProductoMemoria.single('imagen')
  : subirImagenProducto.single('imagen')

router.post('/subir-imagen', verificarToken, middlewareSubirImagen, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ mensaje: 'Debes enviar un archivo de imagen (campo "imagen")' })
  }
  let url
  if (estaConfiguradoCloudinary() && req.file.buffer) {
    url = await subirImagenCloudinary(req.file.buffer, req.file.mimetype)
    if (!url) {
      return res.status(502).json({ mensaje: 'Error al subir la imagen a Cloudinary. Revisa la configuración.' })
    }
  } else {
    const baseUrl = process.env.URL_SERVIDOR ||
      (process.env.VERCEL && process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, '')}`
        : `http://localhost:${process.env.PUERTO || 3000}`)
    url = `${baseUrl.replace(/\/$/, '')}/uploads/${req.file.filename}`
  }
  res.status(201).json({ url })
})

router.use((err, _req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ mensaje: `La imagen no puede superar ${TAMANO_MAXIMO_IMAGEN_MB} MB` })
  }
  if (err.message && err.message.includes('Solo se permiten')) {
    return res.status(400).json({ mensaje: err.message })
  }
  next(err)
})

/** Crear producto (solo establecimiento) */
router.post('/', verificarToken, async (req, res) => {
  try {
    const { nombre, descripcion, precio, imagen } = req.body
    if (!nombre?.trim()) {
      return res.status(400).json({ mensaje: 'El nombre del producto es obligatorio' })
    }
    const precioNum = Number(precio)
    if (Number.isNaN(precioNum) || precioNum < 0) {
      return res.status(400).json({ mensaje: 'El precio debe ser un número mayor o igual a 0' })
    }
    const imagenUrl = typeof imagen === 'string' ? imagen.trim() || null : null

    const pool = await obtenerConexion()
    const establecimientoId = await obtenerEstablecimientoId(pool, req.usuarioId)
    if (!establecimientoId) {
      return res.status(403).json({ mensaje: 'No tienes un establecimiento registrado' })
    }

    const insertado = await pool.query(
      `INSERT INTO productos (establecimiento_id, nombre, descripcion, precio, imagen)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nombre, descripcion, precio, imagen, creado_en`,
      [establecimientoId, nombre.trim(), (descripcion || '').trim(), precioNum, imagenUrl]
    )
    const fila = insertado.rows[0]
    res.status(201).json({
      id: fila.id,
      nombre: fila.nombre,
      descripcion: fila.descripcion || '',
      precio: Number(fila.precio),
      imagen: fila.imagen || null,
      creado_en: fila.creado_en,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ mensaje: 'Error al crear el producto' })
  }
})

/** Actualizar producto (solo dueño del establecimiento) */
router.put('/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params
    const { nombre, descripcion, precio, imagen } = req.body
    if (!nombre?.trim()) {
      return res.status(400).json({ mensaje: 'El nombre del producto es obligatorio' })
    }
    const precioNum = Number(precio)
    if (Number.isNaN(precioNum) || precioNum < 0) {
      return res.status(400).json({ mensaje: 'El precio debe ser un número mayor o igual a 0' })
    }
    const imagenUrl = typeof imagen === 'string' ? imagen.trim() || null : null

    const pool = await obtenerConexion()
    const establecimientoId = await obtenerEstablecimientoId(pool, req.usuarioId)
    if (!establecimientoId) {
      return res.status(403).json({ mensaje: 'No tienes un establecimiento registrado' })
    }

    const actualizado = await pool.query(
      `UPDATE productos
       SET nombre = $1, descripcion = $2, precio = $3, imagen = $4
       WHERE id = $5 AND establecimiento_id = $6
       RETURNING id, nombre, descripcion, precio, imagen, creado_en`,
      [nombre.trim(), (descripcion || '').trim(), precioNum, imagenUrl, id, establecimientoId]
    )
    if (actualizado.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Producto no encontrado o no te pertenece' })
    }
    const fila = actualizado.rows[0]
    res.json({
      id: fila.id,
      nombre: fila.nombre,
      descripcion: fila.descripcion || '',
      precio: Number(fila.precio),
      imagen: fila.imagen || null,
      creado_en: fila.creado_en,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ mensaje: 'Error al actualizar el producto' })
  }
})

/** Eliminar producto (solo dueño del establecimiento) */
router.delete('/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params
    const pool = await obtenerConexion()
    const establecimientoId = await obtenerEstablecimientoId(pool, req.usuarioId)
    if (!establecimientoId) {
      return res.status(403).json({ mensaje: 'No tienes un establecimiento registrado' })
    }

    const eliminado = await pool.query(
      'DELETE FROM productos WHERE id = $1 AND establecimiento_id = $2 RETURNING id',
      [id, establecimientoId]
    )
    if (eliminado.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Producto no encontrado o no te pertenece' })
    }
    res.status(204).send()
  } catch (err) {
    console.error(err)
    res.status(500).json({ mensaje: 'Error al eliminar el producto' })
  }
})

export default router
