import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contextos/ContextoAuth'

/**
 * Protege rutas que requieren sesión. Si no hay usuario, redirige a /login.
 */
function RutaProtegida({ children }) {
  const { usuario } = useAuth()
  const ubicacion = useLocation()

  if (!usuario) {
    return <Navigate to="/login" state={{ desde: ubicacion.pathname }} replace />
  }

  return children
}

export default RutaProtegida
