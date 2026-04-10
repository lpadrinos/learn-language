import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import TabBar from './components/TabBar'
import Bienvenida from './pages/Bienvenida'
import Registro from './pages/Registro'
import Login from './pages/Login'
import CrearPerfil from './pages/CrearPerfil'
import MiCodigo from './pages/MiCodigo'
import IngresarCodigo from './pages/IngresarCodigo'
import Inicio from './pages/Inicio'
import Chat from './pages/Chat'
import Progreso from './pages/Progreso'
import Perfil from './pages/Perfil'
import ImitaAcento from './pages/juegos/ImitaAcento'
import CastigoLinguistico from './pages/juegos/CastigoLinguistico'
import PalabraProhibida from './pages/juegos/PalabraProhibida'
import RetoBeso from './pages/juegos/RetoBeso'
import CompletaFrase from './pages/juegos/CompletaFrase'
import LeccionDia from './pages/juegos/LeccionDia'
import TresPalabras from './pages/juegos/TresPalabras'
import DibujaYTraduce from './pages/juegos/DibujaYTraduce'
import RetoVelocidad from './pages/juegos/RetoVelocidad'
import FrasesParaLigar from './pages/juegos/FrasesParaLigar'
import HistoriasGuardadas from './pages/HistoriasGuardadas'

function AppRoutes() {
  const { session, profile, pareja, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <span className="loader" style={{ width: 32, height: 32 }} />
      </div>
    )
  }

  // Not logged in
  if (!session) {
    return (
      <Routes>
        <Route path="/registro" element={<Registro />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Bienvenida />} />
      </Routes>
    )
  }

  // Logged in but no profile
  if (!profile) {
    return (
      <Routes>
        <Route path="/crear-perfil" element={<CrearPerfil />} />
        <Route path="*" element={<Navigate to="/crear-perfil" replace />} />
      </Routes>
    )
  }

  // Has profile (con o sin pareja - acceso completo)
  return (
    <>
      <Routes>
        <Route path="/inicio" element={<Inicio />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/progreso" element={<Progreso />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/mi-codigo" element={<MiCodigo />} />
        <Route path="/ingresar-codigo" element={<IngresarCodigo />} />
        <Route path="/crear-perfil" element={<CrearPerfil />} />
        <Route path="/juego/imita-acento" element={<ImitaAcento />} />
        <Route path="/juego/castigo-linguistico" element={<CastigoLinguistico />} />
        <Route path="/juego/palabra-prohibida" element={<PalabraProhibida />} />
        <Route path="/juego/reto-beso" element={<RetoBeso />} />
        <Route path="/juego/completa-frase" element={<CompletaFrase />} />
        <Route path="/juego/leccion-dia" element={<LeccionDia />} />
        <Route path="/juego/tres-palabras" element={<TresPalabras />} />
        <Route path="/juego/dibuja-traduce" element={<DibujaYTraduce />} />
        <Route path="/juego/reto-velocidad" element={<RetoVelocidad />} />
        <Route path="/juego/frases-para-ligar" element={<FrasesParaLigar />} />
        <Route path="/historias" element={<HistoriasGuardadas />} />
        <Route path="*" element={<Navigate to="/inicio" replace />} />
      </Routes>
      <TabBar />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
