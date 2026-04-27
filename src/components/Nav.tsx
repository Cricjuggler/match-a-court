import { Link, useLocation } from 'react-router-dom';
import { authClient } from '../lib/auth';
import { useSession } from '../lib/useSession';
import { useNotifications } from '../lib/useNotifications';

export function Nav() {
  const { user, loading } = useSession();
  const location = useLocation();
  const { unreadCount } = useNotifications();

  const active = (path: string) =>
    location.pathname === path ? 'active' : '';

  async function signOut() {
    try {
      await (authClient as any).signOut?.();
    } finally {
      window.location.href = '/';
    }
  }

  return (
    <>
      {/* ── Top bar ── */}
      <nav className="nav">
        <Link to="/" className="logo">
          <img src="/logo.png" alt="Match-A-Court" className="logo-img" />
          <div className="logo-wordmark">
            <span className="logo-top">Match-A-Court</span>
            <span className="logo-bottom">Book · Play · Connect</span>
          </div>
        </Link>

        {/* Desktop links */}
        <div className="nav-links nav-desktop">
          <Link to="/" className={active('/')}>Courts</Link>
          <Link to="/find-game" className={active('/find-game')}>Find a Game</Link>
          <Link to="/my-bookings" className={active('/my-bookings')}>My Bookings</Link>
          {!loading && user && (
            <Link to="/notifications" className={`notif-bell ${active('/notifications')}`} title="Notifications">
              🔔
              {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </Link>
          )}
          {!loading && (
            user ? (
              <>
                <Link to="/account/settings" className="user-chip">
                  {user.name ?? user.email ?? 'Account'}
                </Link>
                <button className="btn ghost" onClick={signOut}>Sign out</button>
              </>
            ) : (
              <Link to="/auth/sign-in" className="btn" style={{ padding: '6px 12px' }}>
                Sign in
              </Link>
            )
          )}
        </div>

        {/* Mobile: bell + auth */}
        <div className="nav-mobile-auth">
          {!loading && user && (
            <Link to="/notifications" className={`notif-bell ${active('/notifications')}`}>
              🔔
              {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </Link>
          )}
          {!loading && (
            user ? (
              <button className="btn ghost" onClick={signOut}
                style={{ fontSize: 13, padding: '6px 10px' }}>
                Sign out
              </button>
            ) : (
              <Link to="/auth/sign-in" className="btn"
                style={{ padding: '6px 14px', fontSize: 13 }}>
                Sign in
              </Link>
            )
          )}
        </div>
      </nav>

      {/* ── Bottom nav (mobile only) ── */}
      <nav className="bottom-nav">
        <Link to="/" className={`bnav-item ${active('/')}`}>
          <span className="bnav-icon">🏸</span>
          <span className="bnav-label">Courts</span>
        </Link>
        <Link to="/find-game" className={`bnav-item ${active('/find-game')}`}>
          <span className="bnav-icon">🤝</span>
          <span className="bnav-label">Find Game</span>
        </Link>
        <Link to="/my-bookings" className={`bnav-item ${active('/my-bookings')}`}>
          <span className="bnav-icon">📋</span>
          <span className="bnav-label">Bookings</span>
        </Link>
        <Link to="/notifications" className={`bnav-item ${active('/notifications')}`} style={{ position: 'relative' }}>
          <span className="bnav-icon">
            🔔
            {unreadCount > 0 && (
              <span className="bnav-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </span>
          <span className="bnav-label">Alerts</span>
        </Link>
        <Link to="/account/settings"
          className={`bnav-item ${location.pathname.startsWith('/account') ? 'active' : ''}`}>
          <span className="bnav-icon">👤</span>
          <span className="bnav-label">Account</span>
        </Link>
      </nav>
    </>
  );
}
