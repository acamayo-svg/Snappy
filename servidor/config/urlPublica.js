/**
 * URL pública del backend (webhooks, uploads sin Cloudinary).
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

/**
 * URL del front (back_urls de Mercado Pago). Fuerza https salvo localhost.
 */
export function urlBaseFrontend() {
  let u = (process.env.FRONTEND_URL || 'http://localhost:5173').trim().replace(/\/$/, '')
  if (u.startsWith('http://') && !/localhost|127\.0\.0\.1/.test(u)) {
    u = `https://${u.slice('http://'.length)}`
  }
  return u
}
