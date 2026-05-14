/** Token Bearer: prioriza Auth0 (si está registrado el getter) y cae al JWT local en sessionStorage. */

let obtenerTokenAuth0 = null
let cerrarSesionAuth0 = null

export function configurarObtenerTokenAuth0(fn) {
  obtenerTokenAuth0 = typeof fn === 'function' ? fn : null
}

export function configurarCerrarSesionAuth0(fn) {
  cerrarSesionAuth0 = typeof fn === 'function' ? fn : null
}

/** Si hay flujo Auth0 activo, dispara cierre en Auth0 (redirección). Devuelve true si se invocó. */
export function ejecutarCierreAuth0Opcional() {
  if (!cerrarSesionAuth0) return false
  cerrarSesionAuth0()
  return true
}

export async function obtenerBearer() {
  if (obtenerTokenAuth0) {
    try {
      const t = await obtenerTokenAuth0()
      if (t) return t
    } catch {
      // Continuar con token local
    }
  }
  return sessionStorage.getItem('snappy_token')
}
