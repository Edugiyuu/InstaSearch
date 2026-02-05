import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Profiles from './pages/Profiles'
import Analysis from './pages/Analysis'
import Content from './pages/Content'
import Calendar from './pages/Calendar'
import Settings from './pages/Settings'
import MyProfile from './pages/MyProfile'
import VideoPrompts from './pages/VideoPrompts'
import VideoPublish from './pages/VideoPublish'
import './styles/App.css'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/my-profile" element={<MyProfile />} />
          <Route path="/profiles" element={<Profiles />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/content" element={<Content />} />
          <Route path="/video-prompts" element={<VideoPrompts />} />
          <Route path="/video-publish" element={<VideoPublish />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App
