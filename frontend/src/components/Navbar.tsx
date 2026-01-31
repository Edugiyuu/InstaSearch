import './Navbar.css'

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <span className="navbar-icon">📸</span>
          <span className="navbar-title">InstaSearch</span>
        </div>
        
        <div className="navbar-right">
          <button className="navbar-btn">
            🔔
          </button>
          <div className="navbar-user">
            <div className="navbar-avatar">👤</div>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
