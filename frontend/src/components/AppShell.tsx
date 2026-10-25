import { ReactNode, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useInstagram } from '../hooks/useInstagram'
import './AppShell.css'

// Trilho de ícones do redesign "linha de produção" (ADR 0038). Estilos fica dentro da Biblioteca.
// `match` diz quando o item fica aceso: Ideias e Números dividem a rota /ideias (a aba muda)
const NAV = [
  { to: '/', icon: '▦', label: 'Painel', match: (path: string) => path === '/' || path === '/projetos' },
  { to: '/ideias', icon: '◎', label: 'Ideias', match: (path: string, aba: string | null) => path === '/ideias' && aba !== 'desempenho' },
  { to: '/calendario', icon: '▤', label: 'Agenda', match: (path: string) => path === '/calendario' },
  { to: '/ideias?aba=desempenho', icon: '↗', label: 'Números', match: (path: string, aba: string | null) => path === '/ideias' && aba === 'desempenho' },
  { to: '/biblioteca', icon: '▣', label: 'Biblioteca', match: (path: string) => path === '/biblioteca' || path === '/estilos' },
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

/** Trilho de ícones + conteúdo. Sem children, renderiza a rota filha (layout route). */
function AppShell({ children }: { children?: ReactNode }) {
  const { account, connected, loading } = useInstagram()
  const [legacyOpen, setLegacyOpen] = useState(false)
  const { pathname, search } = useLocation()
  const aba = new URLSearchParams(search).get('aba')

  const accountLabel = loading
    ? 'Verificando o Instagram…'
    : connected && account
      ? `@${account.username} · Instagram conectado`
      : 'Instagram desconectado'

  return (
    <div className="shell">
      <aside className="rail">
        <Link to="/" className="rail-brand" title="InstaSearch · do tema ao Short">
          IS
        </Link>

        <Link to="/novo" className="rail-new" title="Novo vídeo" aria-label="Novo vídeo">
          +
        </Link>

        <nav className="rail-nav">
          {NAV.map(item => (
            <Link key={item.label} to={item.to} className={`rail-link${item.match(pathname, aba) ? ' active' : ''}`}>
              <span className="rail-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="rail-foot">
          <div className="rail-legacy">
            <button className="rail-link" onClick={() => setLegacyOpen(o => !o)} title="Ferramentas antigas" aria-expanded={legacyOpen}>
              <span className="rail-icon">⋯</span>
            </button>
            {legacyOpen && (
              <div className="rail-flyout" onClick={() => setLegacyOpen(false)}>
                <span className="label">Ferramentas antigas</span>
                {LEGACY.map(item => (
                  <NavLink key={item.to} to={item.to}>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>

          <NavLink to="/configuracoes" className="rail-link" title="Configurações" aria-label="Configurações">
            <span className="rail-icon">⚙</span>
          </NavLink>

          <Link to="/configuracoes" className="rail-account" title={accountLabel} aria-label={accountLabel}>
            {account?.profile?.profilePictureUrl ? (
              <img className="rail-avatar" src={account.profile.profilePictureUrl} alt="" />
            ) : (
              <span className="rail-avatar" />
            )}
            <span className={`rail-status${connected ? ' on' : ''}`} />
          </Link>
        </div>
      </aside>

      <main className="shell-main">{children ?? <Outlet />}</main>
    </div>
  )
}

export default AppShell
