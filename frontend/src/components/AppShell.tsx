import { ReactNode, useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useInstagram } from '../hooks/useInstagram'
import NewVideoPalette, { PaletteStart } from './NewVideoPalette'
import './AppShell.css'

// Trilho de ícones do redesign "linha de produção" (ADR 0038). Estilos fica dentro da Biblioteca.
// `match` diz quando o item fica aceso (Estilos acende a Biblioteca, a rota /novo acende o Início)
const NAV = [
  { to: '/', icon: '⌂', label: 'Início', match: (path: string) => path === '/' || path === '/novo' },
  { to: '/projetos', icon: '▦', label: 'Projetos', match: (path: string) => path === '/projetos' },
  { to: '/ideias', icon: '◎', label: 'Ideias', match: (path: string) => path === '/ideias' },
  { to: '/calendario', icon: '▤', label: 'Agenda', match: (path: string) => path === '/calendario' },
  { to: '/numeros', icon: '↗', label: 'Números', match: (path: string) => path === '/numeros' },
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
  const navigate = useNavigate()

  // a paleta de novo vídeo abre por cima da tela atual (o + e o Ctrl K) ou pela rota /novo,
  // que chega já preenchida das Ideias, dos Estilos e do Início (ADR 0038)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const onNewRoute = pathname === '/novo'
  const paletteStart: PaletteStart = onNewRoute ? Object.fromEntries(new URLSearchParams(search)) : {}
  const closePalette = useCallback(() => {
    setPaletteOpen(false)
    if (onNewRoute) navigate('/')
  }, [onNewRoute, navigate])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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

        <button className="rail-new" onClick={() => setPaletteOpen(true)} title="Novo vídeo (Ctrl K)" aria-label="Novo vídeo">
          +
        </button>

        <nav className="rail-nav">
          {NAV.map(item => (
            <Link key={item.label} to={item.to} className={`rail-link${item.match(pathname) ? ' active' : ''}`}>
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

      {(paletteOpen || onNewRoute) && <NewVideoPalette key={onNewRoute ? search : 'atalho'} start={paletteStart} onClose={closePalette} />}
    </div>
  )
}

export default AppShell
