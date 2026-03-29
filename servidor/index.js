import 'dotenv/config'
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import cors from 'cors'
import { inicializarTabla } from './config/basedatos.js'
import rutasAuth from './rutas/auth.js'
import rutasProductos from './rutas/productos.js'
import rutasPagos from './rutas/pagos.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// 1x1 transparent GIF (evita CORB cuando la imagen no existe en serverless)
const IMAGEN_404 = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
const app = express()
const puerto = parseInt(process.env.PORT || process.env.PUERTO || '3000', 10)
const esVercel = process.env.VERCEL === '1'

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/api/health', (req, res) => {
  res.json({ ok: true, mensaje: 'API Snappy' })
})
app.get('/', (req, res) => {
  res.json({ ok: true, mensaje: 'API Snappy' })
})

let dbInicializada = false
app.use(async (req, res, next) => {
  if (dbInicializada) return next()
  try {
    await inicializarTabla()
    dbInicializada = true
    next()
  } catch (err) {
    console.error('Error al conectar con PostgreSQL:', err.message)
    res.status(503).json({ mensaje: 'Base de datos no disponible.' })
  }
})

const directorioUploads = esVercel ? '/tmp/uploads' : path.join(__dirname, 'public', 'uploads')
app.use('/uploads', express.static(directorioUploads, { fallthrough: true }))
app.get('/uploads/:nombre', (req, res) => {
  res.status(404).type('image/gif').send(IMAGEN_404)
})
app.use('/api/auth', rutasAuth)
app.use('/api/productos', rutasProductos)
app.use('/api/pagos', rutasPagos)

if (!esVercel) {
  async function iniciar() {
    try {
      await inicializarTabla()
      console.log('Base de datos lista.')
    } catch (err) {
      console.error('Error al conectar con PostgreSQL:', err.message)
      process.exit(1)
    }
    app.listen(puerto, () => {
      console.log(`Servidor Snappy en http://localhost:${puerto}`)
    })
  }
  iniciar()
}

export default app
