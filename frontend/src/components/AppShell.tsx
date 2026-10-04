import { ReactNode, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useInstagram } from '../hooks/useInstagram'
import './AppShell.css'

const NAV = [
  { to: '/', icon: '⌂', label: 'Início', end: true },
  { to: '/projetos', icon: '▦', label: 'Projetos' },
  { to: '/biblioteca', icon: '▣', label: 'Biblioteca' },
  { to: '/estilos', icon: '✦', label: 'Estilos' },
  { to: '/calendario', icon: '▤', label: 'Calendário' },
]

const LEGACY = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/my-profile', label: 'Meu perfil' },
  { to: '/profiles', label: 'Perfis' },
  { to: '/analysis', label: 'Análises' },
  { to: '/content', label: 'Conteúdo' },
  { to: '/video-prompts', label: 'Video prompts' },
  { to: '/video-publish', label: 'Publicar reel' },
]

/** Menu lateral + conteúdo. Sem children, renderiza a rota filha (layout route). */
function AppShell({ children }: { children?: ReactNode }) {
  const { account, connected, loading } = useInstagram()
  const [legacyOpen, setLegacyOpen] = useState(false)

  return (
    <div className="shell">
      <aside className="side">
        <Link to="/" className="side-brand">
          <span className="side-logo">InstaSearch</span>
          <span className="side-tagline">do tema ao Short</span>
        </Link>

        <Link to="/novo" className="btn-y side-new">
          + Novo vídeo
        </Link>

        <nav className="side-nav">
          {NAV.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end} className="side-link">
              <span className="side-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
          <hr className="side-divider" />
          <NavLink to="/configuracoes" className="side-link">
            <span className="side-icon">⚙</span>
            Configurações
          </NavLink>

          <button className="side-legacy-toggle" onClick={() => setLegacyOpen(o => !o)}>
            {legacyOpen ? '▾' : '▸'} Ferramentas antigas
          </button>
          {legacyOpen &&
            LEGACY.map(item => (
              <NavLink key={item.to} to={item.to} className="side-link side-link-sm">
                {item.label}
              </NavLink>
            ))}
        </nav>

        <Link to="/configuracoes" className="side-account">
          {account?.profile?.profilePictureUrl ? (
            <img className="side-avatar" src={account.profile.profilePictureUrl} alt="" />
          ) : (
            <span className="side-avatar" />
          )}
          <span>
            <strong>{connected && account ? `@${account.username}` : '@seu_canal'}</strong>
            {loading ? (
              <small className="c-muted">verificando…</small>
            ) : connected ? (
              <small className="c-success">● Instagram conectado</small>
            ) : (
              <small className="c-muted">○ Instagram desconectado</small>
            )}
          </span>
        </Link>
      </aside>

      <main className="shell-main">{children ?? <Outlet />}</main>
    </div>
  )
}

export default AppShell
