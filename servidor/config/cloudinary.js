/**
 * Cloudinary: subida de imágenes desde buffer (multer en memoria).
 * Si CLOUDINARY_CLOUD_NAME no está definido, las funciones no hacen nada.
 */
import { v2 as cloudinary } from 'cloudinary'

const configurado =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET

if (configurado) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })
}

const CARPETA = 'snappy/productos'

/**
 * Sube un buffer de imagen a Cloudinary.
 * @param {Buffer} buffer - Contenido del archivo
 * @param {string} mimetype - Ej. image/jpeg
 * @param {string} [nombre] - Nombre opcional para public_id
 * @returns {Promise<string|null>} URL segura de la imagen o null si falla o no está configurado
 */
export async function subirImagenCloudinary(buffer, mimetype, nombre) {
  if (!configurado || !buffer || !mimetype) return null
  try {
    const dataUri = `data:${mimetype};base64,${buffer.toString('base64')}`
    const publicId = nombre ? `${CARPETA}/${nombre.replace(/\.[a-z]+$/i, '')}` : undefined
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: CARPETA,
      ...(publicId && { public_id: publicId }),
    })
    return result?.secure_url ?? null
  } catch (err) {
    console.error('Error al subir imagen a Cloudinary:', err?.message)
    return null
  }
}

export function estaConfiguradoCloudinary() {
  return !!configurado
}
