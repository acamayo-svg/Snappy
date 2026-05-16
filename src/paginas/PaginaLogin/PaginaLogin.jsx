import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contextos/ContextoAuth'
import { supabase } from '../../lib/supabaseCliente.js'
import estilos from './PaginaLogin.module.css'

function redirectOauth() {
  return `${window.location.origin}/auth/callback`
}

export default function PaginaLogin() {
  const [paso, setPaso] = useState('email')
  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [mensaje, setMensaje] = useState(null)
  const [enviando, setEnviando] = useState(false)

  const { usuario, cargando, refrescarCuenta } = useAuth()
  const navegar = useNavigate()

  useEffect(() => {
    if (usuario) navegar(usuario.obtenerRutaInicio(), { replace: true })
  }, [usuario, navegar])

  if (usuario) return null

  if (!supabase) {
    return (
      <div className={estilos.contenedor}>
        <div className={estilos.tarjeta}>
          <h1 className={estilos.titulo}>Iniciar sesión</h1>
          <p className={estilos.mensajeError} role="alert">
            Configura en el front las variables{' '}
            <code className={estilos.codigoInline}>VITE_SUPABASE_URL</code> y{' '}
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
      const correo = email.trim().toLowerCase()
      const { error: err } = await supabase.auth.signInWithOtp({
        email: correo,
        options: { shouldCreateUser: true },
      })
      if (err) throw err
      setPaso('codigo')
      setMensaje('Revisa tu correo e ingresa el código que te enviamos.')
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
      const correo = email.trim().toLowerCase()
      const { error: err } = await supabase.auth.verifyOtp({
        email: correo,
        token: codigo.replace(/\s/g, ''),
        type: 'email',
      })
      if (err) throw err
      const cuenta = await refrescarCuenta()
      if (!cuenta) {
        setMensaje(
          'Sesión iniciada, pero la API no cargó tu perfil. Comprueba VITE_API_URL y las variables SUPABASE en Render.'
        )
      }
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
        <h1 className={estilos.titulo}>Iniciar sesión</h1>
        <p className={estilos.subtitulo}>Código al correo o cuenta Google / Microsoft</p>

        {paso === 'email' ? (
          <form onSubmit={enviarCodigo} className={estilos.formulario}>
            {mensaje && (
              <div className={estilos.mensajeInfo} role="status">
                {mensaje}
              </div>
            )}

            <label className={estilos.etiqueta}>
              Correo electrónico
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={estilos.campo}
                placeholder="tu@correo.com"
                autoComplete="email"
                required
                disabled={enviando || cargando}
              />
            </label>

            <button type="submit" className={estilos.boton} disabled={enviando || cargando}>
              {enviando ? 'Enviando…' : 'Enviar código'}
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

            <p className={estilos.enlaceRegistro}>
              ¿No tienes cuenta? <Link to="/registro">Regístrate</Link>
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
              Código enviado a <strong>{email.trim().toLowerCase()}</strong>
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
              {enviando ? 'Verificando…' : 'Verificar e ingresar'}
            </button>

            <button
              type="button"
              className={estilos.botonTexto}
              disabled={enviando}
              onClick={() => {
                setPaso('email')
                setCodigo('')
                setMensaje(null)
              }}
            >
              Cambiar correo
            </button>

            <p className={estilos.enlaceRegistro}>
              ¿No tienes cuenta? <Link to="/registro">Regístrate</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
