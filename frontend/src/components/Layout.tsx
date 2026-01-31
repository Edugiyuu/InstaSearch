import { ReactNode } from 'react'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import './Layout.css'

interface LayoutProps {
  children: ReactNode
}

function Layout({ children }: LayoutProps) {
  return (
    <div className="layout">
      <Navbar />
      <div className="layout-container">
        <Sidebar />
        <main className="layout-main">
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout
