import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const esVercel = process.env.VERCEL === '1'
// En Vercel el sistema de archivos es de solo lectura; usar /tmp para subidas o no crear carpeta
const directorioUploads = esVercel ? path.join('/tmp', 'uploads') : path.join(__dirname, '..', 'public', 'uploads')

if (!esVercel && !fs.existsSync(directorioUploads)) {
  fs.mkdirSync(directorioUploads, { recursive: true })
}

const extensionesPermitidas = /\.(jpe?g|png|gif|webp)$/i
const tiposMimePermitidos = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

const almacenamiento = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (esVercel && !fs.existsSync(directorioUploads)) {
      try { fs.mkdirSync(directorioUploads, { recursive: true }) } catch (_) {}
    }
    cb(null, directorioUploads)
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

const TAMANO_MAXIMO_MB = 30
export const subirImagenProducto = multer({
  storage: almacenamiento,
  fileFilter: filtroArchivo,
  limits: { fileSize: TAMANO_MAXIMO_MB * 1024 * 1024 },
})
export const TAMANO_MAXIMO_IMAGEN_MB = TAMANO_MAXIMO_MB
