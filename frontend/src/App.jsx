/**
 * Raíz de la aplicación: configura los proveedores de tema y autenticación,
 * y las rutas (login pública, resto protegido por sesión).
 */

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import RutaProtegida from './auth/RutaProtegida'
import { useAuth } from './auth/useAuth'
import Inicio from './paginas/Inicio'
import Login from './paginas/Login'
import { TemaProvider } from './tema/TemaContext'

/** Si ya hay una sesión activa y se entra a /login, redirige a la pantalla de inicio. */
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
                  <Inicio />
                </RutaProtegida>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TemaProvider>
  )
}

export default App
