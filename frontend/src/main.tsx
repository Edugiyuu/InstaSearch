import React from 'react'
import ReactDOM from 'react-dom/client'
// Estilos globais antes do App, para o CSS de cada tela poder sobrescrever.
import './styles/index.css'
import './styles/App.css'
import './styles/ui.css'
import App from './App.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
