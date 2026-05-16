import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contextos/ContextoAuth'
import { supabase } from '../../lib/supabaseCliente.js'
import estilos from './PaginaRegistro.module.css'

function redirectOauth() {
  return `${window.location.origin}/auth/callback`
}

export default function PaginaRegistro() {
  const [paso, setPaso] = useState('datos')
  const [correo, setCorreo] = useState('')
  const [nombre, setNombre] = useState('')
  const [codigo, setCodigo] = useState('')
  const [mensaje, setMensaje] = useState(null)
  const [enviando, setEnviando] = useState(false)

  const { usuario, cargando } = useAuth()
  const navegar = useNavigate()

  useEffect(() => {
    if (usuario) navegar(usuario.obtenerRutaInicio(), { replace: true })
  }, [usuario, navegar])

  if (usuario) return null

  if (!supabase) {
    return (
      <div className={estilos.contenedor}>
        <div className={estilos.tarjeta}>
          <h1 className={estilos.titulo}>Crear cuenta</h1>
          <p className={estilos.mensajeError} role="alert">
            Configura <code className={estilos.codigoInline}>VITE_SUPABASE_URL</code> y{' '}
            <code className={estilos.codigoInline}>VITE_SUPABASE_ANON_KEY</code>.
          </p>
        </div>
      </div>
    )
  }

  const enviarCodigo = async (e) => {
    e.preventDefault()
    setMensaje(null)
    setEnviando(true)
    try {
      const email = correo.trim().toLowerCase()
      if (!nombre.trim()) {
        setMensaje('El nombre es obligatorio.')
        return
      }
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          data: { nombre_display: nombre.trim() },
        },
      })
      if (err) throw err
      setPaso('codigo')
      setMensaje('Revisa tu correo e ingresa el código de verificación.')
    } catch (err) {
      setMensaje(err?.message ?? 'No se pudo enviar el código.')
    } finally {
      setEnviando(false)
    }
  }

  const verificarCodigo = async (e) => {
    e.preventDefault()
    setMensaje(null)
    setEnviando(true)
    try {
      const email = correo.trim().toLowerCase()
      const { error: err } = await supabase.auth.verifyOtp({
        email,
        token: codigo.trim(),
        type: 'email',
      })
      if (err) throw err
    } catch (err) {
      setMensaje(err?.message ?? 'Código incorrecto o caducado.')
    } finally {
      setEnviando(false)
    }
  }

  const oauth = async (proveedor) => {
    setMensaje(null)
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: proveedor,
        options: { redirectTo: redirectOauth() },
      })
      if (err) throw err
    } catch (err) {
      setMensaje(err?.message ?? 'No se pudo abrir el proveedor.')
    }
  }

  return (
    <div className={estilos.contenedor}>
      <div className={estilos.tarjeta}>
        <h1 className={estilos.titulo}>Crear cuenta</h1>
        <p className={estilos.subtitulo}>
          Regístrate con correo (código de verificación) o con Google / Microsoft. Luego podrás activar
          negocio o domiciliario desde Mi cuenta.
        </p>

        {paso === 'datos' ? (
          <form onSubmit={enviarCodigo} className={estilos.formulario}>
            {mensaje && (
              <div className={estilos.mensajeInfo} role="status">
                {mensaje}
              </div>
            )}

            <label className={estilos.etiqueta}>
              Nombre
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className={estilos.campo}
                placeholder="Tu nombre"
                autoComplete="name"
                required
                disabled={enviando || cargando}
              />
            </label>

            <label className={estilos.etiqueta}>
              Correo electrónico
              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                className={estilos.campo}
                placeholder="tu@correo.com"
                autoComplete="email"
                required
                disabled={enviando || cargando}
              />
            </label>

            <button type="submit" className={estilos.boton} disabled={enviando || cargando}>
              {enviando ? 'Enviando…' : 'Enviar código al correo'}
            </button>

            <p className={estilos.separador}>o</p>

            <div className={estilos.filaOAuth}>
              <button
                type="button"
                className={estilos.botonOAuth}
                disabled={enviando}
                onClick={() => void oauth('google')}
              >
                Google
              </button>
              <button
                type="button"
                className={estilos.botonOAuth}
                disabled={enviando}
                onClick={() => void oauth('azure')}
              >
                Microsoft
              </button>
            </div>

            <p className={estilos.enlaceLogin}>
              ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
            </p>
          </form>
        ) : (
          <form onSubmit={verificarCodigo} className={estilos.formulario}>
            {mensaje && (
              <div className={estilos.mensajeInfo} role="status">
                {mensaje}
              </div>
            )}

            <p className={estilos.textoCorreo}>
              Código enviado a <strong>{correo.trim().toLowerCase()}</strong>
            </p>

            <label className={estilos.etiqueta}>
              Código de verificación
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                className={estilos.campoCodigo}
                placeholder="123456"
                maxLength={12}
                required
                disabled={enviando}
              />
            </label>

            <button type="submit" className={estilos.boton} disabled={enviando}>
              {enviando ? 'Verificando…' : 'Verificar y crear cuenta'}
            </button>

            <button
              type="button"
              className={estilos.botonTexto}
              disabled={enviando}
              onClick={() => {
                setPaso('datos')
                setCodigo('')
                setMensaje(null)
              }}
            >
              Volver
            </button>

            <p className={estilos.enlaceLogin}>
              ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
