import { Routes, Route, Navigate } from 'react-router-dom'
import { ProveedorAuth } from './contextos/ContextoAuth'
import { ProveedorCarrito } from './contextos/ContextoCarrito'
import { SincronizarAuth0 } from './componentes/SincronizarAuth0/SincronizarAuth0'
import BarraMenu from './componentes/BarraMenu/BarraMenu'
import RutaProtegida from './componentes/RutaProtegida/RutaProtegida'
import PaginaPrincipal from './paginas/PaginaPrincipal/PaginaPrincipal'
import PaginaLogin from './paginas/PaginaLogin/PaginaLogin'
import PaginaRegistro from './paginas/PaginaRegistro/PaginaRegistro'
import PaginaCuenta from './paginas/PaginaCuenta/PaginaCuenta'
import PaginaCliente from './paginas/PaginaCliente/PaginaCliente'
import PaginaEstablecimiento from './paginas/PaginaEstablecimiento/PaginaEstablecimiento'
import PaginaDomiciliario from './paginas/PaginaDomiciliario/PaginaDomiciliario'
import PaginaRetornoPago from './paginas/PaginaRetornoPago/PaginaRetornoPago'
import PaginaBusqueda from './paginas/PaginaBusqueda/PaginaBusqueda'

import estilos from './App.module.css'

const hayAuth0EnEntorno =
  Boolean(import.meta.env.VITE_AUTH0_DOMAIN) && Boolean(import.meta.env.VITE_AUTH0_CLIENT_ID)

function App() {
  return (
    <ProveedorAuth>
      {hayAuth0EnEntorno ? <SincronizarAuth0 /> : null}
      <ProveedorCarrito>
        <BarraMenu />
        <main className={estilos.contenedorPrincipal}>
          <Routes>
            <Route path="/" element={<PaginaPrincipal />} />
            <Route path="/login" element={<PaginaLogin />} />
            <Route path="/registro" element={<PaginaRegistro />} />
            <Route
              path="/cuenta"
              element={
                <RutaProtegida>
                  <PaginaCuenta />
                </RutaProtegida>
              }
            />
            <Route path="/buscar" element={<PaginaBusqueda />} />
            <Route path="/cliente" element={<PaginaCliente />} />
            <Route path="/establecimiento" element={<PaginaEstablecimiento />} />
            <Route path="/domiciliario" element={<PaginaDomiciliario />} />
            <Route path="/pago/wompi/resultado" element={<PaginaRetornoPago />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </ProveedorCarrito>
    </ProveedorAuth>
  )
}

export default App
