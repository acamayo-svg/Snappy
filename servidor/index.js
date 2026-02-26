import 'dotenv/config'
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import cors from 'cors'
import { inicializarTabla } from './config/basedatos.js'
import rutasAuth from './rutas/auth.js'
import rutasProductos from './rutas/productos.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const puerto = parseInt(process.env.PUERTO || '3000', 10)
const esVercel = process.env.VERCEL === '1'

const orígenesCors = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL,
].filter(Boolean)
app.use(cors({ origin: orígenesCors.length ? orígenesCors : true, credentials: true }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/api/health', (req, res) => {
  res.json({ ok: true, mensaje: 'API Snappy' })
})
app.get('/', (req, res) => {
  res.redirect(302, '/api/health')
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

app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')))
app.use('/api/auth', rutasAuth)
app.use('/api/productos', rutasProductos)
// Rutas de pagos (Mercado Pago) se cargan bajo demanda para evitar fallos en serverless
let rutasPagosCache = null
app.use('/api/pagos', async (req, res, next) => {
  try {
    if (!rutasPagosCache) rutasPagosCache = (await import('./rutas/pagos.js')).default
    rutasPagosCache(req, res, next)
  } catch (err) {
    console.error('Error al cargar rutas de pagos:', err)
    res.status(503).json({ mensaje: 'Módulo de pagos no disponible.' })
  }
})

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
