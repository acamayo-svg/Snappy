import Usuario from './Usuario.js'

/**
 * Producto concreto: usuario con rol Establecimiento.
 */
export default class UsuarioEstablecimiento extends Usuario {
  constructor(datos) {
    super({ ...datos, rol: 'establecimiento' })
  }

  obtenerRutaInicio() {
    return '/establecimiento'
  }

  obtenerEtiquetaRol() {
    return 'Establecimiento'
  }
}
