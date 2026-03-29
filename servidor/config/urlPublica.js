/**
 * URL pública del backend (uploads sin Cloudinary).
 * Orden: URL_SERVIDOR explícita → Render → Vercel → localhost.
 */
export function urlBaseServidor() {
  const explicit = process.env.URL_SERVIDOR?.trim().replace(/\/$/, '')
  if (explicit) return explicit

  const render = process.env.RENDER_EXTERNAL_URL?.trim().replace(/\/$/, '')
  if (render) return render

  if (process.env.VERCEL && process.env.VERCEL_URL) {
    return `https://${String(process.env.VERCEL_URL).replace(/^https?:\/\//, '')}`
  }

  const puerto = process.env.PORT || process.env.PUERTO || 3000
  return `http://localhost:${puerto}`
}
