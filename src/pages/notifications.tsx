import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../lib/useSession';
import { useNotifications } from '../lib/useNotifications';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const TYPE_ICON: Record<string, string> = {
  player_joined: '🏸',
};

export function NotificationsPage() {
  const { user, loading: sessionLoading } = useSession();
  const { notifications, fetchAll, markRead, markAllRead } = useNotifications();

  useEffect(() => {
    if (user) fetchAll();
  }, [user, fetchAll]);

  if (sessionLoading) return <div className="empty">Loading…</div>;

  if (!user) {
    return (
      <>
        <h2>Notifications</h2>
        <div className="signin-gate">
          <p>Sign in to see your notifications.</p>
          <Link to="/auth/sign-in" className="btn">Sign in</Link>
        </div>
      </>
    );
  }

  const unread = notifications.filter(n => !n.read).length;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h2>Notifications</h2>
        {unread > 0 && (
          <button className="btn ghost" style={{ fontSize: 13, padding: '5px 12px' }} onClick={markAllRead}>
            Mark all read
          </button>
        )}
      </div>
      <p className="subtitle">
        {unread > 0 ? `${unread} unread notification${unread !== 1 ? 's' : ''}` : 'All caught up!'}
      </p>

      {notifications.length === 0 ? (
        <div className="empty" style={{ paddingTop: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔔</div>
          <div>No notifications yet</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>
            When players join your games, you'll be notified here.
          </div>
        </div>
      ) : (
        <div>
          {notifications.map(n => (
            <div
              key={n.id}
              className={`notif-row${n.read ? '' : ' unread'}`}
              onClick={() => !n.read && markRead(n.id)}
            >
              <div className="notif-icon">
                {TYPE_ICON[n.type] ?? '🔔'}
              </div>
              <div className="notif-body">
                <div className="notif-title">{n.title}</div>
                <div className="notif-text">{n.body}</div>
                <div className="notif-time">{timeAgo(n.createdAt)}</div>
              </div>
              {!n.read && <div className="notif-dot" />}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
