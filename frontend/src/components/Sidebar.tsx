import { NavLink } from 'react-router-dom'
import './Sidebar.css'

function Sidebar() {
  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className="sidebar-link">
          <span className="sidebar-icon">📊</span>
          <span className="sidebar-text">Dashboard</span>
        </NavLink>
        
        <NavLink to="/profiles" className="sidebar-link">
          <span className="sidebar-icon">👥</span>
          <span className="sidebar-text">Perfis</span>
        </NavLink>
        
        <NavLink to="/analysis" className="sidebar-link">
          <span className="sidebar-icon">🔍</span>
          <span className="sidebar-text">Análises</span>
        </NavLink>
        
        <NavLink to="/content" className="sidebar-link">
          <span className="sidebar-icon">✨</span>
          <span className="sidebar-text">Conteúdo</span>
        </NavLink>
        
        <NavLink to="/calendar" className="sidebar-link">
          <span className="sidebar-icon">📅</span>
          <span className="sidebar-text">Calendário</span>
        </NavLink>
        
        <NavLink to="/settings" className="sidebar-link">
          <span className="sidebar-icon">⚙️</span>
          <span className="sidebar-text">Configurações</span>
        </NavLink>
      </nav>
    </aside>
  )
}

export default Sidebar
