import Usuario from './Usuario.js'

/**
 * Producto concreto: usuario con rol Domiciliario.
 */
export default class UsuarioDomiciliario extends Usuario {
  constructor(datos) {
    super({ ...datos, rol: 'domiciliario' })
  }

  obtenerRutaInicio() {
    return '/domiciliario'
  }

  obtenerEtiquetaRol() {
    return 'Domiciliario'
  }
}
