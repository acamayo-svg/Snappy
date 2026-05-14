import { useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { useAuth } from '../../contextos/ContextoAuth'
import {
  configurarObtenerTokenAuth0,
  configurarCerrarSesionAuth0,
} from '../../servicios/tokenSesion'

/**
 * Registra el obtención de access token de Auth0 y sincroniza el usuario con la API (/api/auth/yo).
 * Solo debe montarse cuando existen variables de Auth0 y Auth0Provider envuelve la app.
 */
export function SincronizarAuth0() {
  const { isAuthenticated, getAccessTokenSilently, logout } = useAuth0()
  const { refrescarCuenta } = useAuth()
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE

  useEffect(() => {
    configurarObtenerTokenAuth0(() =>
      getAccessTokenSilently({
        authorizationParams: audience ? { audience } : undefined,
      })
    )
    configurarCerrarSesionAuth0(() => {
      logout({ logoutParams: { returnTo: window.location.origin } })
    })
    return () => {
      configurarObtenerTokenAuth0(null)
      configurarCerrarSesionAuth0(null)
    }
  }, [getAccessTokenSilently, logout, audience])

  useEffect(() => {
    if (!isAuthenticated) return
    void (async () => {
      try {
        await refrescarCuenta()
        sessionStorage.removeItem('snappy_token')
      } catch {
        // refrescarCuenta ya traga errores internos; nada crítico aquí
      }
    })()
  }, [isAuthenticated, refrescarCuenta])

  return null
}
