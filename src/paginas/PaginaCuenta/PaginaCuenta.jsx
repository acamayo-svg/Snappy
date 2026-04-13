import { useState, useEffect } from 'react'
import { useAuth } from '../../contextos/ContextoAuth'
import { guardarPerfilEnvioApi } from '../../servicios/servicioAuth'
import estilos from './PaginaCuenta.module.css'

function PaginaCuenta() {
  const { usuario, registrarNegocio, serDomiciliario, refrescarCuenta, cargando, error } = useAuth()
  const [mostrarFormNegocio, setMostrarFormNegocio] = useState(false)
  const [tipoEstablecimiento, setTipoEstablecimiento] = useState('comida')
  const [nombreNegocio, setNombreNegocio] = useState('')
  const [direccion, setDireccion] = useState('')
  const [telefono, setTelefono] = useState('')
  const [envDir, setEnvDir] = useState('')
  const [envTel, setEnvTel] = useState('')
  const [envNota, setEnvNota] = useState('')
  const [mensajeEnvio, setMensajeEnvio] = useState(null)
  const [guardandoEnvio, setGuardandoEnvio] = useState(false)

  const tieneEstablecimiento = usuario?.tieneRol('establecimiento')
  const tieneDomiciliario = usuario?.tieneRol('domiciliario')

  useEffect(() => {
    refrescarCuenta()
  }, [refrescarCuenta])

  useEffect(() => {
    if (!usuario) return
    setEnvDir(String(usuario.envio?.direccion ?? ''))
    setEnvTel(String(usuario.envio?.telefono ?? ''))
    setEnvNota(String(usuario.envio?.nota ?? ''))
  }, [usuario])

  const enviarNegocio = async (e) => {
    e.preventDefault()
    try {
      await registrarNegocio({
        nombre_negocio: nombreNegocio,
        direccion,
        telefono,
        tipo_establecimiento: tipoEstablecimiento,
      })
      setMostrarFormNegocio(false)
      setTipoEstablecimiento('comida')
      setNombreNegocio('')
      setDireccion('')
      setTelefono('')
    } catch {
      // Error en contexto
    }
  }

  const activarDomiciliario = async () => {
    try {
      await serDomiciliario()
    } catch {
      // Error en contexto
    }
  }

  const guardarEnvio = async (e) => {
    e.preventDefault()
    setMensajeEnvio(null)
    setGuardandoEnvio(true)
    try {
      await guardarPerfilEnvioApi({
        direccion: envDir.trim(),
        telefono: envTel.trim(),
        nota: envNota.trim(),
      })
      await refrescarCuenta()
      setMensajeEnvio('Datos de envío guardados.')
    } catch (err) {
      setMensajeEnvio(err?.message ?? 'No se pudo guardar')
    } finally {
      setGuardandoEnvio(false)
    }
  }

  if (!usuario) return null

  return (
    <div className={estilos.contenedor}>
      <div className={estilos.contenido}>
        <h1 className={estilos.titulo}>Mi cuenta</h1>
        <p className={estilos.subtitulo}>
          Gestiona tu perfil y activa las opciones que necesites.
        </p>

        <section className={estilos.seccion}>
          <h2 className={estilos.seccionTitulo}>Datos personales</h2>
          <div className={estilos.tarjeta}>
            <p className={estilos.campo}>
              <span className={estilos.campoEtiqueta}>Nombre</span>
              {usuario.nombre}
            </p>
            <p className={estilos.campo}>
              <span className={estilos.campoEtiqueta}>Correo</span>
              {usuario.email}
            </p>
            <p className={estilos.campo}>
              <span className={estilos.campoEtiqueta}>Roles activos</span>
              {usuario.obtenerRoles().map((r) => (
                <span key={r} className={estilos.badge}>
                  {r === 'cliente' ? 'Cliente' : r === 'establecimiento' ? 'Establecimiento' : 'Domiciliario'}
                </span>
              ))}
            </p>
          </div>
        </section>

        <section className={estilos.seccion}>
          <h2 className={estilos.seccionTitulo}>Datos de envío a domicilio</h2>
          <div className={estilos.tarjeta}>
            <p className={estilos.opcionTexto}>
              Dirección y teléfono se usan en cada pedido. Si no los completás aquí, te los pediremos antes de pagar.
            </p>
            <form onSubmit={guardarEnvio} className={estilos.formNegocio}>
              <label className={estilos.etiqueta}>
                Dirección
                <input
                  type="text"
                  value={envDir}
                  onChange={(e) => setEnvDir(e.target.value)}
                  className={estilos.campoInput}
                  placeholder="Calle, barrio, ciudad…"
                  required
                  disabled={guardandoEnvio}
                />
              </label>
              <label className={estilos.etiqueta}>
                Teléfono de contacto
                <input
                  type="tel"
                  value={envTel}
                  onChange={(e) => setEnvTel(e.target.value)}
                  className={estilos.campoInput}
                  placeholder="WhatsApp o celular"
                  required
                  disabled={guardandoEnvio}
                />
              </label>
              <label className={estilos.etiqueta}>
                Nota para el repartidor (opcional)
                <textarea
                  value={envNota}
                  onChange={(e) => setEnvNota(e.target.value)}
                  className={estilos.campoInput}
                  placeholder="Torre, portería, referencias…"
                  rows={2}
                  disabled={guardandoEnvio}
                />
              </label>
              {mensajeEnvio && (
                <p className={mensajeEnvio.includes('guardados') ? estilos.mensajeOk : estilos.mensajeError} role="status">
                  {mensajeEnvio}
                </p>
              )}
              <button type="submit" className={estilos.boton} disabled={guardandoEnvio}>
                {guardandoEnvio ? 'Guardando…' : 'Guardar datos de envío'}
              </button>
            </form>
          </div>
        </section>

        <section className={estilos.seccion}>
          <h2 className={estilos.seccionTitulo}>Opciones para tu cuenta</h2>

          {!tieneEstablecimiento && (
            <div className={estilos.tarjeta}>
              <h3 className={estilos.opcionTitulo}>Registrar mi negocio</h3>
              <p className={estilos.opcionTexto}>
                ¿Tienes un restaurante o tienda? Regístralo y empieza a recibir pedidos por Snappy.
              </p>
              {!mostrarFormNegocio ? (
                <button
                  type="button"
                  className={estilos.boton}
                  onClick={() => setMostrarFormNegocio(true)}
                  disabled={cargando}
                >
                  Registrar negocio
                </button>
              ) : (
                <form onSubmit={enviarNegocio} className={estilos.formNegocio}>
                  {error && (
                    <div className={estilos.mensajeError} role="alert">
                      {error}
                    </div>
                  )}
                  <label className={estilos.etiqueta}>
                    Tipo de negocio
                    <select
                      value={tipoEstablecimiento}
                      onChange={(e) => setTipoEstablecimiento(e.target.value)}
                      className={estilos.campoInput}
                      disabled={cargando}
                    >
                      <option value="comida">Comida / Restaurante</option>
                      <option value="tienda">Tienda (otros productos)</option>
                    </select>
                  </label>
                  <label className={estilos.etiqueta}>
                    Nombre del negocio
                    <input
                      type="text"
                      value={nombreNegocio}
                      onChange={(e) => setNombreNegocio(e.target.value)}
                      className={estilos.campoInput}
                      placeholder="Ej. Mi restaurante"
                      required
                      disabled={cargando}
                    />
                  </label>
                  <label className={estilos.etiqueta}>
                    Dirección
                    <input
                      type="text"
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                      className={estilos.campoInput}
                      placeholder="Dirección del local"
                      disabled={cargando}
                    />
                  </label>
                  <label className={estilos.etiqueta}>
                    Teléfono
                    <input
                      type="tel"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      className={estilos.campoInput}
                      placeholder="Teléfono de contacto"
                      disabled={cargando}
                    />
                  </label>
                  <div className={estilos.botonesForm}>
                    <button type="submit" className={estilos.boton} disabled={cargando}>
                      {cargando ? 'Guardando…' : 'Guardar negocio'}
                    </button>
                    <button
                      type="button"
                      className={estilos.botonSecundario}
                      onClick={() => setMostrarFormNegocio(false)}
                      disabled={cargando}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {tieneEstablecimiento && (
            <div className={estilos.tarjeta}>
              <h3 className={estilos.opcionTitulo}>Negocio registrado</h3>
              <p className={estilos.opcionTexto}>
                Ya tienes un negocio vinculado a esta cuenta. Puedes gestionarlo desde el área de Establecimiento.
              </p>
              {usuario?.establecimiento?.tipo_nombre && (
                <p className={estilos.campo}>
                  <span className={estilos.campoEtiqueta}>Tipo</span>
                  {usuario.establecimiento.tipo_nombre}
                </p>
              )}
            </div>
          )}

          {!tieneDomiciliario && (
            <div className={estilos.tarjeta}>
              <h3 className={estilos.opcionTitulo}>Ser domiciliario</h3>
              <p className={estilos.opcionTexto}>
                ¿Quieres repartir pedidos y ganar por cada entrega? Activa esta opción en tu cuenta.
              </p>
              <button
                type="button"
                className={estilos.boton}
                onClick={activarDomiciliario}
                disabled={cargando}
              >
                {cargando ? 'Activando…' : 'Quiero ser domiciliario'}
              </button>
            </div>
          )}

          {tieneDomiciliario && (
            <div className={estilos.tarjeta}>
              <h3 className={estilos.opcionTitulo}>Domiciliario activo</h3>
              <p className={estilos.opcionTexto}>
                Ya estás registrado como domiciliario. Entra al área Domiciliario para ver pedidos disponibles.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default PaginaCuenta
