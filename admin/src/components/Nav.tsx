import { NavLink, Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function Nav() {
  const { user, logout } = useAuth()

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link to="/" className="nav-brand">
          <span className="nav-brand-title">🏸 Court Book</span>
          <span className="nav-brand-subtitle">Admin</span>
        </Link>

        <ul className="nav-links">
          <li>
            <NavLink
              to="/"
              end
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/courts"
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              Courts
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/businesses"
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              Businesses
            </NavLink>
          </li>
        </ul>

        <div className="nav-right">
          {user && (
            <span className="nav-user">
              {user.name}
            </span>
          )}
          <button
            className="btn btn-ghost btn-sm"
            onClick={logout}
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}
