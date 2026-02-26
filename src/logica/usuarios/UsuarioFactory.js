import Usuario from './Usuario.js'

/**
 * Factory Method: crea la instancia de usuario a partir de los datos
 * que devuelve el backend (id, email, nombre, roles).
 * Soporta tanto "roles" (array) como "rol" (único) por compatibilidad.
 */
export function crearUsuario(datos) {
  const roles = Array.isArray(datos?.roles)
    ? datos.roles
    : datos?.rol
      ? [datos.rol]
      : ['cliente']
  return new Usuario({
    id: datos?.id,
    email: datos?.email,
    nombre: datos?.nombre,
    roles,
    rolActivo: datos?.rolActivo,
    establecimiento: datos?.establecimiento ?? null,
    domiciliario: datos?.domiciliario ?? null,
  })
}
