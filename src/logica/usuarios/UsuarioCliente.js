import Usuario from './Usuario.js'

/**
 * Producto concreto: usuario con rol Cliente.
 */
export default class UsuarioCliente extends Usuario {
  constructor(datos) {
    super({ ...datos, rol: 'cliente' })
  }

  obtenerRutaInicio() {
    return '/cliente'
  }

  obtenerEtiquetaRol() {
    return 'Cliente'
  }
}
