import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { BookingWithCourt } from '../types';
import { apiFetch } from '../lib/api';
import { useSession } from '../lib/useSession';

interface GroupGame {
  id: string;
  role: 'host' | 'player';
  hostName: string;
  courtName: string;
  courtLocation: string;
  courtPhoto: string | null;
  date: string;
  startHour: number;
  slotsNeeded: number;
  joinedCount: number;
  spotsLeft: number;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function GameCard({ game, onLeave }: { game: GroupGame; onLeave?: () => void }) {
  const isHost = game.role === 'host';
  return (
    <div className="booking-row" style={{ alignItems: 'flex-start', gap: 12 }}>
      <div className="info" style={{ flex: 1 }}>
        <div className="court" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {game.courtName}
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '2px 7px',
            borderRadius: 20, background: isHost ? 'var(--free)' : '#e8f0fe',
            color: isHost ? 'var(--accent)' : '#2563eb',
          }}>
            {isHost ? '👑 Host' : '🏸 Joined'}
          </span>
        </div>
        <div className="when">
          {game.courtLocation} · {formatDate(game.date)} · {String(game.startHour).padStart(2, '0')}:00 – {String(game.startHour + 1).padStart(2, '0')}:00
        </div>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
          {Array.from({ length: game.slotsNeeded + 1 }).map((_, i) => (
            <div
              key={i}
              className={`player-slot ${i === 0 ? 'slot-host' : i <= game.joinedCount ? 'slot-joined' : 'slot-empty'}`}
              title={i === 0 ? 'Host' : i <= game.joinedCount ? 'Joined' : 'Open spot'}
            />
          ))}
          <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 6 }}>
            {isHost
              ? game.joinedCount === 0
                ? 'Waiting for players…'
                : `${game.joinedCount}/${game.slotsNeeded} joined`
              : `Hosted by ${game.hostName}`}
          </span>
        </div>
      </div>
      {!isHost && onLeave && (
        <button className="btn danger" style={{ whiteSpace: 'nowrap', alignSelf: 'center' }} onClick={onLeave}>
          Leave
        </button>
      )}
    </div>
  );
}

export function MyBookings() {
  const { user, loading: sessionLoading } = useSession();
  const [bookings, setBookings] = useState<BookingWithCourt[] | null>(null);
  const [groupGames, setGroupGames] = useState<{ hosting: GroupGame[]; joined: GroupGame[] } | null>(null);

  async function refresh() {
    const [soloRes, groupRes] = await Promise.all([
      apiFetch('/api/my-bookings'),
      apiFetch('/api/my-group-games'),
    ]);
    setBookings(soloRes.ok ? await soloRes.json() : []);
    setGroupGames(groupRes.ok ? await groupRes.json() : { hosting: [], joined: [] });
  }

  useEffect(() => {
    if (!sessionLoading && user) refresh();
  }, [sessionLoading, user]);

  async function handleCancel(id: string) {
    const r = await apiFetch(`/api/bookings/${id}`, { method: 'DELETE' });
    if (r.ok) refresh();
  }

  if (sessionLoading) return <div className="empty">Loading…</div>;

  if (!user) {
    return (
      <>
        <h2>My bookings</h2>
        <div className="signin-gate">
          <p>Sign in to see your bookings.</p>
          <Link to="/auth/sign-in" className="btn">Sign in / Sign up</Link>
        </div>
      </>
    );
  }

  if (bookings === null || groupGames === null) return <div className="empty">Loading…</div>;

  const { hosting, joined } = groupGames;
  const hasAnything = bookings.length > 0 || hosting.length > 0 || joined.length > 0;

  return (
    <>
      <h2>My bookings</h2>
      <p className="subtitle">Signed in as {user.name ?? user.email}</p>

      {!hasAnything && (
        <div className="empty">
          No bookings yet. <Link to="/">Find a court</Link>
        </div>
      )}

      {/* ── Games I'm Hosting ── */}
      {hosting.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 15, margin: '0 0 10px', color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            Games I'm hosting
          </h3>
          {hosting.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </section>
      )}

      {/* ── Games I've Joined ── */}
      {joined.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 15, margin: '0 0 10px', color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            Games I've joined
          </h3>
          {joined.map((g) => (
            <GameCard
              key={g.id}
              game={g}
              onLeave={async () => {
                const r = await apiFetch(`/api/group-bookings/${g.id}/join`, { method: 'DELETE' });
                if (r.ok) refresh();
              }}
            />
          ))}
        </section>
      )}

      {/* ── Solo bookings ── */}
      {bookings.length > 0 && (
        <section>
          <h3 style={{ fontSize: 15, margin: '0 0 10px', color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            Solo bookings
          </h3>
          {bookings.map((b) => (
            <div key={b.id} className="booking-row">
              <div className="info">
                <div className="court">{b.courtName}</div>
                <div className="when">
                  {b.courtLocation} · {formatDate(b.date)} · {String(b.startHour).padStart(2, '0')}:00
                </div>
              </div>
              <button className="btn danger" onClick={() => handleCancel(b.id)}>Cancel</button>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
