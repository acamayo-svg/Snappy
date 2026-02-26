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
