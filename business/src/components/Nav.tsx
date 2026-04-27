import { NavLink, Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function Nav() {
  const { isAuthenticated, user, logout } = useAuth()

  return (
    <nav className="nav">
      <Link to="/" className="nav-brand">
        <span className="nav-brand-title">🏸 Court Book</span>
        <span className="nav-brand-subtitle">Business</span>
      </Link>

      {isAuthenticated && (
        <div className="nav-links">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/courts/new"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            Add Court
          </NavLink>
        </div>
      )}

      {isAuthenticated && user && (
        <div className="nav-user">
          <span className="nav-email">{user.email}</span>
          <button className="btn btn-ghost btn-sm" onClick={logout}>
            Sign out
          </button>
        </div>
      )}
    </nav>
  )
}
