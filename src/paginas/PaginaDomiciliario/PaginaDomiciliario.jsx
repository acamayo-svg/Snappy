import { Link } from 'react-router-dom'
import { useAuth } from '../../contextos/ContextoAuth'
import estilos from './PaginaDomiciliario.module.css'

function PaginaDomiciliario() {
  const { usuario } = useAuth()
  const tieneDomiciliario = usuario?.tieneRol('domiciliario')

  return (
    <div className={estilos.contenedor}>
      <section className={estilos.banner}>
        <div className={estilos.bannerContenido}>
          <h1 className={estilos.titulo}>Sé domiciliario Snappy</h1>
          <p className={estilos.subtitulo}>
            Horarios flexibles, ingresos extras. Recoge pedidos en establecimientos y entrégalos a domicilio.
          </p>
          <span className={estilos.badge}>Domiciliario</span>
        </div>
      </section>
      <div className={estilos.contenido}>
        <section className={estilos.tarjetas}>
          <article className={estilos.tarjeta}>
            <span className={estilos.tarjetaIcono}>🛵</span>
            <h3 className={estilos.tarjetaTitulo}>Tú eliges cuándo</h3>
            <p className={estilos.tarjetaTexto}>
              Conecta cuando quieras y acepta los pedidos que te convengan.
            </p>
          </article>
          <article className={estilos.tarjeta}>
            <span className={estilos.tarjetaIcono}>💰</span>
            <h3 className={estilos.tarjetaTitulo}>Gana por entrega</h3>
            <p className={estilos.tarjetaTexto}>
              Cobra por cada entrega completada de forma segura.
            </p>
          </article>
          <article className={estilos.tarjeta}>
            <span className={estilos.tarjetaIcono}>📍</span>
            <h3 className={estilos.tarjetaTitulo}>Rutas claras</h3>
            <p className={estilos.tarjetaTexto}>
              Recoge en el establecimiento y lleva hasta la dirección del cliente.
            </p>
          </article>
        </section>

        <section className={estilos.seccionRegistro}>
          <div className={estilos.cajaRegistro}>
            <h2 className={estilos.tituloRegistro}>Quiero ser domiciliario</h2>
            <p className={estilos.textoRegistro}>
              Si quieres repartir pedidos y ganar por cada entrega, crea una cuenta en Snappy y desde{' '}
              <strong>Mi cuenta</strong> activa la opción &quot;Ser domiciliario&quot;. No necesitas usar la app
              como cliente: solo actívalo y empieza a recibir pedidos para repartir.
            </p>
            {!usuario ? (
              <div className={estilos.botonesRegistro}>
                <Link to="/registro" className={estilos.botonPrincipal}>
                  Crear cuenta
                </Link>
                <Link to="/login" className={estilos.botonSecundario}>
                  Ya tengo cuenta
                </Link>
              </div>
            ) : tieneDomiciliario ? (
              <div className={estilos.estadoRegistro}>
                <p className={estilos.textoEstado}>Ya estás registrado como domiciliario.</p>
                <Link to="/cuenta" className={estilos.enlaceCuenta}>
                  Ver Mi cuenta →
                </Link>
              </div>
            ) : (
              <div className={estilos.botonesRegistro}>
                <Link to="/cuenta" className={estilos.botonPrincipal}>
                  Activar en Mi cuenta
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export default PaginaDomiciliario
