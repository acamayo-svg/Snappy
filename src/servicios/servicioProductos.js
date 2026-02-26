/**
 * Servicio de productos. GET list es público; crear/editar/eliminar requieren token (establecimiento).
 */

const URL_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

function obtenerToken() {
  return sessionStorage.getItem('snappy_token')
}

function peticion(ruta, opciones = {}) {
  const token = obtenerToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...opciones.headers,
  }
  return fetch(`${URL_BASE}${ruta}`, { ...opciones, headers })
}

/** Listar todos los productos (público). Opcional: establecimientoId para filtrar por tienda */
export async function listarProductosApi(establecimientoId = null) {
  const url = establecimientoId
    ? `/api/productos?establecimiento_id=${establecimientoId}`
    : '/api/productos'
  const respuesta = await fetch(`${URL_BASE}${url}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })
  const data = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) throw new Error(data.mensaje ?? 'Error al cargar productos')
  return data
}

/** Listar mis productos (establecimiento autenticado) */
export async function listarMisProductosApi() {
  const respuesta = await peticion('/api/productos/mis-productos')
  const data = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) throw new Error(data.mensaje ?? 'Error al cargar tus productos')
  return data
}

/** Crear producto */
export async function crearProductoApi(datos) {
  const respuesta = await peticion('/api/productos', {
    method: 'POST',
    body: JSON.stringify({
      nombre: datos.nombre,
      descripcion: datos.descripcion,
      precio: datos.precio,
      imagen: datos.imagen ?? null,
    }),
  })
  const data = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) throw new Error(data.mensaje ?? 'Error al crear el producto')
  return data
}

/** Actualizar producto */
export async function actualizarProductoApi(id, datos) {
  const respuesta = await peticion(`/api/productos/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      nombre: datos.nombre,
      descripcion: datos.descripcion,
      precio: datos.precio,
      imagen: datos.imagen ?? null,
    }),
  })
  const data = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) throw new Error(data.mensaje ?? 'Error al actualizar el producto')
  return data
}

/** Eliminar producto */
export async function eliminarProductoApi(id) {
  const respuesta = await peticion(`/api/productos/${id}`, { method: 'DELETE' })
  if (respuesta.status === 204) return
  const data = await respuesta.json().catch(() => ({}))
  throw new Error(data.mensaje ?? 'Error al eliminar el producto')
}

/** Subir imagen de producto (archivo desde el dispositivo). Devuelve { url } */
export async function subirImagenProductoApi(archivo) {
  const token = obtenerToken()
  const formData = new FormData()
  formData.append('imagen', archivo)
  const respuesta = await fetch(`${URL_BASE}/api/productos/subir-imagen`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  const data = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) throw new Error(data.mensaje ?? 'Error al subir la imagen')
  return data.url
}
