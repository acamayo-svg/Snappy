import { Routes, Route, Navigate } from 'react-router-dom'
import { ProveedorAuth } from './contextos/ContextoAuth'
import { ProveedorCarrito } from './contextos/ContextoCarrito'
import BarraMenu from './componentes/BarraMenu/BarraMenu'
import RutaProtegida from './componentes/RutaProtegida/RutaProtegida'
import PaginaPrincipal from './paginas/PaginaPrincipal/PaginaPrincipal'
import PaginaLogin from './paginas/PaginaLogin/PaginaLogin'
import PaginaRegistro from './paginas/PaginaRegistro/PaginaRegistro'
import PaginaCuenta from './paginas/PaginaCuenta/PaginaCuenta'
import PaginaCliente from './paginas/PaginaCliente/PaginaCliente'
import PaginaEstablecimiento from './paginas/PaginaEstablecimiento/PaginaEstablecimiento'
import PaginaDomiciliario from './paginas/PaginaDomiciliario/PaginaDomiciliario'

import estilos from './App.module.css'

function App() {
  return (
    <ProveedorAuth>
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
            <Route path="/cliente" element={<PaginaCliente />} />
            <Route path="/establecimiento" element={<PaginaEstablecimiento />} />
            <Route path="/domiciliario" element={<PaginaDomiciliario />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </ProveedorCarrito>
    </ProveedorAuth>
  )
}

export default App
