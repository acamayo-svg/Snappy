import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contextos/ContextoAuth'
import estilos from './PaginaRegistro.module.css'

function PaginaRegistro() {
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [nombre, setNombre] = useState('')

  const { usuario, registrar, cargando, error } = useAuth()
  const navegar = useNavigate()

  useEffect(() => {
    if (usuario) {
      navegar(usuario.obtenerRutaInicio(), { replace: true })
    }
  }, [usuario, navegar])

  if (usuario) return null

  const manejarEnvio = async (e) => {
    e.preventDefault()
    try {
      const usuarioCreado = await registrar({ correo, contrasena, nombre })
      navegar(usuarioCreado.obtenerRutaInicio(), { replace: true })
    } catch {
      // Error en contexto
    }
  }

  return (
    <div className={estilos.contenedor}>
      <div className={estilos.tarjeta}>
        <h1 className={estilos.titulo}>Crear cuenta</h1>
        <p className={estilos.subtitulo}>Regístrate como cliente. Luego podrás activar negocio o domiciliario desde Mi cuenta.</p>

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
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className={estilos.campo}
              placeholder="tu@correo.com"
              autoComplete="email"
              required
              disabled={cargando}
            />
          </label>

          <label className={estilos.etiqueta}>
            Contraseña (mínimo 6 caracteres)
            <input
              type="password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              className={estilos.campo}
              placeholder="••••••••"
              autoComplete="new-password"
              minLength={6}
              required
              disabled={cargando}
            />
          </label>

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
              disabled={cargando}
            />
          </label>

          <button type="submit" className={estilos.boton} disabled={cargando}>
            {cargando ? 'Creando cuenta…' : 'Registrarme'}
          </button>

          <p className={estilos.enlaceLogin}>
            ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
          </p>
        </form>
      </div>
    </div>
  )
}

export default PaginaRegistro
