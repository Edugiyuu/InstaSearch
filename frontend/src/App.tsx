import { BrowserRouter as Router, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import Home from './pages/Home'
import NewVideo from './pages/NewVideo'
import Script from './pages/Script'
import Assembly from './pages/Assembly'
import Review from './pages/Review'
import ReplaceImage from './pages/ReplaceImage'
import Projects from './pages/Projects'
import Library from './pages/Library'
import Styles from './pages/Styles'
import Calendar from './pages/Calendar'
import Settings from './pages/Settings'
// Ferramentas antigas (antes do fluxo tema → Short)
import Dashboard from './pages/Dashboard'
import Profiles from './pages/Profiles'
import Analysis from './pages/Analysis'
import Content from './pages/Content'
import MyProfile from './pages/MyProfile'
import VideoPrompts from './pages/VideoPrompts'
import VideoPublish from './pages/VideoPublish'

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/novo" element={<NewVideo />} />
          <Route path="/projeto/:id/roteiro" element={<Script />} />
          <Route path="/projeto/:id/montagem" element={<Assembly />} />
          <Route path="/projetos" element={<Projects />} />
          <Route path="/biblioteca" element={<Library />} />
          <Route path="/estilos" element={<Styles />} />
          <Route path="/calendario" element={<Calendar />} />
          <Route path="/configuracoes" element={<Settings />} />
        </Route>

        {/* Tela cheia, sem menu lateral */}
        <Route path="/projeto/:id" element={<Review />} />
        <Route path="/projeto/:id/imagens" element={<ReplaceImage />} />

        <Route
          element={
            <AppShell>
              <div className="page">
                <Outlet />
              </div>
            </AppShell>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/my-profile" element={<MyProfile />} />
          <Route path="/profiles" element={<Profiles />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/content" element={<Content />} />
          <Route path="/video-prompts" element={<VideoPrompts />} />
          <Route path="/video-publish" element={<VideoPublish />} />
        </Route>

        <Route path="/calendar" element={<Navigate to="/calendario" replace />} />
        <Route path="/settings" element={<Navigate to="/configuracoes" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
