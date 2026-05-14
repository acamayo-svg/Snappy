/**
 * Servicio de autenticación. Llama al backend Node.js (Express).
 * Respuesta: { token, usuario: { id, email, nombre, roles } }
 */

import { obtenerBearer } from './tokenSesion.js'

const URL_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')

async function peticion(ruta, opciones = {}) {
  const token = await obtenerBearer()
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...opciones.headers,
  }
  return fetch(`${URL_BASE}${ruta}`, { ...opciones, headers })
}

export async function iniciarSesionApi(credenciales) {
  const respuesta = await peticion('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: credenciales.email,
      contraseña: credenciales.contraseña,
    }),
  })
  const datos = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) throw new Error(datos.mensaje ?? 'Error al iniciar sesión')
  return datos
}

export async function registroApi(datos) {
  const respuesta = await peticion('/api/auth/registro', {
    method: 'POST',
    body: JSON.stringify({
      correo: datos.correo,
      contrasena: datos.contrasena,
      nombre: datos.nombre,
    }),
  })
  const body = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) throw new Error(body.mensaje ?? 'Error al registrarse')
  return body
}

export async function obtenerMiCuentaApi() {
  const respuesta = await peticion('/api/auth/yo')
  const body = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) throw new Error(body.mensaje ?? 'Error al cargar la cuenta')
  return body
}

export async function guardarPerfilEnvioApi({ direccion, telefono, nota }) {
  const respuesta = await peticion('/api/auth/perfil-envio', {
    method: 'PUT',
    body: JSON.stringify({
      direccion,
      telefono,
      nota: nota ?? '',
    }),
  })
  const body = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) throw new Error(body.mensaje ?? 'Error al guardar datos de envío')
  return body
}

export async function registrarNegocioApi(datos) {
  const respuesta = await peticion('/api/auth/registrar-negocio', {
    method: 'POST',
    body: JSON.stringify({
      nombre_negocio: datos.nombre_negocio,
      direccion: datos.direccion,
      telefono: datos.telefono,
      tipo_establecimiento: datos.tipo_establecimiento,
    }),
  })
  const body = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) throw new Error(body.mensaje ?? 'Error al registrar el negocio')
  return body
}

export async function serDomiciliarioApi() {
  const respuesta = await peticion('/api/auth/ser-domiciliario', {
    method: 'POST',
    body: JSON.stringify({}),
  })
  const body = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) throw new Error(body.mensaje ?? 'Error al registrarte como domiciliario')
  return body
}

export async function cerrarSesionApi() {}
