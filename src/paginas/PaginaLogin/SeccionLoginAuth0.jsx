import { useAuth0 } from '@auth0/auth0-react'
import estilos from './PaginaLogin.module.css'

/** Botón de inicio con Auth0 (Universal Login). Solo usar bajo Auth0Provider. */
export function SeccionLoginAuth0() {
  const { loginWithRedirect, isLoading } = useAuth0()
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE

  return (
    <>
      <p className={estilos.separadorAuth0}>o</p>
      <button
        type="button"
        className={estilos.botonAuth0}
        disabled={isLoading}
        onClick={() =>
          loginWithRedirect({
            authorizationParams: audience ? { audience } : undefined,
          })
        }
      >
        {isLoading ? 'Cargando…' : 'Continuar con Auth0'}
      </button>
    </>
  )
}
