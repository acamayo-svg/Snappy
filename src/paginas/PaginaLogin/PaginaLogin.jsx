import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contextos/ContextoAuth'
import estilos from './PaginaLogin.module.css'

function PaginaLogin() {
  const [email, setEmail] = useState('')
  const [contraseña, setContraseña] = useState('')

  const { usuario, iniciarSesion, cargando, error } = useAuth()
  const navegar = useNavigate()

  useEffect(() => {
    if (usuario) {
      navegar(usuario.obtenerRutaInicio(), { replace: true })
    }
  }, [usuario, navegar])

  if (usuario) {
    return null
  }

  const manejarEnvio = async (e) => {
    e.preventDefault()
    try {
      const usuarioCreado = await iniciarSesion({ email, contraseña })
      navegar(usuarioCreado.obtenerRutaInicio(), { replace: true })
    } catch {
      // Error ya está en contexto
    }
  }

  return (
    <div className={estilos.contenedor}>
      <div className={estilos.tarjeta}>
        <h1 className={estilos.titulo}>Iniciar sesión</h1>
        <p className={estilos.subtitulo}>Ingresa a tu cuenta Snappy</p>

        <form onSubmit={manejarEnvio} className={estilos.formulario}>
          {error && (
            <div className={estilos.mensajeError} role="alert">
              {error}
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
              disabled={cargando}
            />
          </label>

          <label className={estilos.etiqueta}>
            Contraseña
            <input
              type="password"
              value={contraseña}
              onChange={(e) => setContraseña(e.target.value)}
              className={estilos.campo}
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={cargando}
            />
          </label>

          <button type="submit" className={estilos.boton} disabled={cargando}>
            {cargando ? 'Entrando…' : 'Entrar'}
          </button>

          <p className={estilos.enlaceRegistro}>
            ¿No tienes cuenta? <Link to="/registro">Regístrate</Link>
          </p>
        </form>
      </div>
    </div>
  )
}

export default PaginaLogin
