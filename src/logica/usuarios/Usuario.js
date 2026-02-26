/**
 * Usuario con soporte para varios roles (modelo tipo Rappi).
 * El backend asigna "cliente" al registrarse; desde Mi cuenta puede activar
 * "establecimiento" y "domiciliario".
 */
const RUTAS_POR_ROL = {
  cliente: '/cliente',
  establecimiento: '/establecimiento',
  domiciliario: '/domiciliario',
}

const ETIQUETAS_POR_ROL = {
  cliente: 'Cliente',
  establecimiento: 'Establecimiento',
  domiciliario: 'Domiciliario',
}

export default class Usuario {
  constructor({ id, email, nombre, roles, rolActivo, establecimiento, domiciliario }) {
    this.id = id
    this.email = email
    this.nombre = nombre ?? email
    this.roles = Array.isArray(roles) ? roles : [roles].filter(Boolean)
    if (this.roles.length === 0) this.roles = ['cliente']
    this.rolActivo = rolActivo && this.roles.includes(rolActivo) ? rolActivo : this.roles[0]
    this.establecimiento = establecimiento ?? null
    this.domiciliario = domiciliario ?? null
  }

  obtenerRutaInicio() {
    return RUTAS_POR_ROL[this.rolActivo] ?? RUTAS_POR_ROL.cliente
  }

  obtenerEtiquetaRol() {
    return ETIQUETAS_POR_ROL[this.rolActivo] ?? this.rolActivo
  }

  obtenerRoles() {
    return [...this.roles]
  }

  tieneRol(rol) {
    return this.roles.includes(rol)
  }

  establecerRolActivo(rol) {
    if (this.roles.includes(rol)) this.rolActivo = rol
  }
}
