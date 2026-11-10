/**
 * Raíz de la aplicación: configura los proveedores de tema y autenticación,
 * y las rutas (login pública; el resto, protegido por sesión y envuelto en
 * LayoutPrincipal, que pone la barra lateral y renderiza la sección activa
 * vía <Outlet />).
 */

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import RutaProtegida from './auth/RutaProtegida'
import { useAuth } from './auth/useAuth'
import LayoutPrincipal from './layout/LayoutPrincipal'
import Animales from './paginas/Animales'
import Cuenta from './paginas/Cuenta'
import GruposYLotes from './paginas/GruposYLotes'
import Login from './paginas/Login'
import Pesajes from './paginas/Pesajes'
import Razas from './paginas/Razas'
import Reportes from './paginas/Reportes'
import { TemaProvider } from './tema/TemaContext'

/** Si ya hay una sesión activa y se entra a /login, redirige a la app. */
function RutaLogin() {
  const { usuario } = useAuth()
  return usuario ? <Navigate to="/" replace /> : <Login />
}

function App() {
  return (
    <TemaProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<RutaLogin />} />
            <Route
              path="/"
              element={
                <RutaProtegida>
                  <LayoutPrincipal />
                </RutaProtegida>
              }
            >
              <Route index element={<Navigate to="/animales" replace />} />
              <Route path="animales" element={<Animales />} />
              <Route path="pesajes" element={<Pesajes />} />
              <Route path="catalogos/razas" element={<Razas />} />
              <Route path="catalogos/grupos-y-lotes" element={<GruposYLotes />} />
              <Route path="reportes" element={<Reportes />} />
              <Route path="cuenta" element={<Cuenta />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TemaProvider>
  )
}

export default App
