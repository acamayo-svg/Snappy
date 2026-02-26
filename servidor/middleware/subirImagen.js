import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// En Vercel/serverless (/var/task) el sistema de archivos es de solo lectura: no crear carpetas ahí, usar /tmp
const pareceServerless = process.env.VERCEL === '1' || process.env.VERCEL === 'true' || String(process.env.VERCEL || '').length > 0 || __dirname.startsWith('/var/task')
function getDirectorioUploads() {
  return pareceServerless ? path.join('/tmp', 'uploads') : path.join(__dirname, '..', 'public', 'uploads')
}
const directorioUploads = getDirectorioUploads()

// No crear carpetas al cargar el módulo: en serverless /var/task es solo lectura y falla mkdir
if (!pareceServerless && !fs.existsSync(directorioUploads)) {
  fs.mkdirSync(directorioUploads, { recursive: true })
}

const extensionesPermitidas = /\.(jpe?g|png|gif|webp)$/i
const tiposMimePermitidos = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

const almacenamiento = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = getDirectorioUploads()
    if (pareceServerless && !fs.existsSync(dir)) {
      try { fs.mkdirSync(dir, { recursive: true }) } catch (_) {}
    }
    cb(null, dir)
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg'
    const nombreSeguro = `${randomUUID()}${ext.toLowerCase()}`
    cb(null, nombreSeguro)
  },
})

const filtroArchivo = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase()
  const mimeOk = tiposMimePermitidos.includes(file.mimetype)
  const extOk = extensionesPermitidas.test(ext)
  if (mimeOk && extOk) {
    cb(null, true)
  } else {
    cb(new Error('Solo se permiten imágenes (JPEG, PNG, GIF, WebP)'), false)
  }
}

// Vercel serverless tiene límite ~4.5 MB por petición; usar 4 MB para estar seguros
const TAMANO_MAXIMO_MB = 4
export const subirImagenProducto = multer({
  storage: almacenamiento,
  fileFilter: filtroArchivo,
  limits: { fileSize: TAMANO_MAXIMO_MB * 1024 * 1024 },
})
export const TAMANO_MAXIMO_IMAGEN_MB = TAMANO_MAXIMO_MB
