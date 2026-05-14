import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Auth0Provider } from '@auth0/auth0-react'
import App from './App'
import './estilos/globales.css'

const dominioAuth0 = import.meta.env.VITE_AUTH0_DOMAIN
const clienteAuth0 = import.meta.env.VITE_AUTH0_CLIENT_ID
const audienceAuth0 = import.meta.env.VITE_AUTH0_AUDIENCE

const appConRutas = (
  <BrowserRouter>
    <App />
  </BrowserRouter>
)

ReactDOM.createRoot(document.getElementById('raiz')).render(
  <React.StrictMode>
    {dominioAuth0 && clienteAuth0 ? (
      <Auth0Provider
        domain={dominioAuth0}
        clientId={clienteAuth0}
        authorizationParams={{
          redirect_uri: window.location.origin,
          ...(audienceAuth0 ? { audience: audienceAuth0 } : {}),
        }}
        cacheLocation="localstorage"
      >
        {appConRutas}
      </Auth0Provider>
    ) : (
      appConRutas
    )}
  </React.StrictMode>
)
