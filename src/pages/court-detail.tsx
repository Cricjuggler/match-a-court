import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import type { Court } from '../types';
import { apiFetch } from '../lib/api';
import { useSession } from '../lib/useSession';
import { Slideshow } from '../components/Slideshow';

function toISO(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function formatLong(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function CourtDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useSession();
  const [court, setCourt] = useState<Court | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [dateObj, setDateObj] = useState<Date>(startOfToday());
  const date = toISO(dateObj);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    function onDocClick(e: MouseEvent) {
      if (!pickerWrapRef.current) return;
      if (!pickerWrapRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setPickerOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [pickerOpen]);
  const [bookedHours, setBookedHours] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needPlayers, setNeedPlayers] = useState(false);
  const [slotsNeeded, setSlotsNeeded] = useState<1 | 2 | 3>(1);
  const [openGames, setOpenGames] = useState<any[]>([]);
  const [showMatches, setShowMatches] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiFetch(`/api/courts/${id}`).then(async (r) => {
      if (r.status === 404) setNotFound(true);
      else if (r.ok) setCourt(await r.json());
    });
  }, [id]);

  useEffect(() => {
    if (!id || !user) return;
    apiFetch(`/api/group-bookings?courtId=${id}`).then(async (r) => {
      if (r.ok) setOpenGames(await r.json());
    });
  }, [id, user]);

  async function handleJoinGame(gameId: string) {
    setJoiningId(gameId);
    try {
      const r = await apiFetch(`/api/group-bookings/${gameId}/join`, {
        method: 'POST',
        body: JSON.stringify({ userName: user?.name ?? user?.email ?? 'Player' }),
      });
      if (r.ok) {
        setOpenGames(prev => prev.filter(g => g.id !== gameId));
        navigate('/my-bookings');
      }
    } finally {
      setJoiningId(null);
    }
  }

  async function refreshBooked(d = date) {
    if (!id) return;
    const r = await apiFetch(`/api/courts/${id}/bookings?date=${d}`);
    if (r.ok) {
      const data: { startHour: number }[] = await r.json();
      setBookedHours(new Set(data.map((b) => b.startHour)));
    }
  }

  useEffect(() => {
    setSelected(null);
    if (id) refreshBooked(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, date]);

  const hours = useMemo(() => {
    if (!court) return [];
    const out: number[] = [];
    for (let h = court.openHour; h < court.closeHour; h++) {
      if (!bookedHours.has(h)) out.push(h);
    }
    return out;
  }, [court, bookedHours]);

  if (notFound) {
    return <div className="empty">Court not found. <Link to="/">Back to courts</Link></div>;
  }
  if (!court) return <div className="empty">Loading…</div>;

  async function handleBook() {
    if (selected == null) return;
    setSubmitting(true);
    setError(null);
    try {
      const endpoint = needPlayers ? '/api/group-bookings' : '/api/bookings';
      const body = needPlayers
        ? { courtId: court!.id, date, startHour: selected, slotsNeeded, hostName: user?.name ?? user?.email ?? 'Player' }
        : { courtId: court!.id, date, startHour: selected };

      const r = await apiFetch(endpoint, { method: 'POST', body: JSON.stringify(body) });

      if (r.status === 409) {
        setError('That slot was just booked by someone else.');
        await refreshBooked();
        setSelected(null);
      } else if (r.status === 401) {
        setError('Please sign in again.');
      } else if (!r.ok) {
        setError('Something went wrong. Please try again.');
      } else {
        navigate(needPlayers ? '/find-game' : '/my-bookings');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Link to="/" className="meta">← All courts</Link>

      {(court.photoUrls?.length || court.photoUrl) && (
        <div className="court-hero">
          <Slideshow
            urls={court.photoUrls?.length ? court.photoUrls : [court.photoUrl!]}
            alt={court.name}
          />
        </div>
      )}

      <h2 style={{ marginTop: 12 }}>{court.name}</h2>
      <p className="subtitle">
        {court.location} · {court.surface} · {court.indoor ? 'Indoor' : 'Outdoor'}
      </p>

      <div className="date-bar">
        <span className="meta">Date</span>
        <div className="date-popover" ref={pickerWrapRef}>
          <button
            type="button"
            className="date-chip"
            onClick={() => setPickerOpen((o) => !o)}
            aria-haspopup="dialog"
            aria-expanded={pickerOpen}
          >
            <span>📅</span>
            <strong>{formatLong(dateObj)}</strong>
            <span className="chev">▾</span>
          </button>
          {pickerOpen && (
            <div className="date-popover-panel" role="dialog">
              <DayPicker
                mode="single"
                selected={dateObj}
                onSelect={(d) => {
                  if (d) {
                    setDateObj(d);
                    setPickerOpen(false);
                  }
                }}
                disabled={{ before: startOfToday() }}
                required
                weekStartsOn={1}
              />
            </div>
          )}
        </div>
      </div>

      {/* Find Players at this Court button */}
      {user && openGames.length > 0 && !showMatches && (
        <button
          className="btn"
          style={{ width: '100%', marginBottom: 16, padding: '12px' }}
          onClick={() => setShowMatches(true)}
        >
          🤝 {openGames.length} player{openGames.length > 1 ? 's' : ''} looking for matches at this court
        </button>
      )}

      {/* Open games at this court */}
      {showMatches && openGames.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>🤝 Players looking for matches</h3>
            <button className="btn ghost" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => setShowMatches(false)}>
              Hide
            </button>
          </div>
          {openGames.map((g: any) => (
            <div key={g.id} className="booking-row" style={{ marginBottom: 8 }}>
              <div className="info">
                <div className="court">{g.hostName}'s game · {g.spotsLeft} spot{g.spotsLeft > 1 ? 's' : ''} left</div>
                <div className="when">
                  📅 {new Date(g.date + 'T00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  {' '}· 🕐 {String(g.startHour).padStart(2, '0')}:00
                </div>
              </div>
              <button
                className="btn"
                disabled={joiningId === g.id}
                onClick={() => handleJoinGame(g.id)}
              >
                {joiningId === g.id ? 'Joining…' : 'Join'}
              </button>
            </div>
          ))}
        </div>
      )}

      {hours.length > 0 ? (
        <>
          <div className="legend">
            <span><span className="dot" style={{ background: 'var(--free)' }} /> Available</span>
            <span><span className="dot" style={{ background: 'var(--accent)' }} /> Selected</span>
          </div>

          <div className="slot-grid">
            {hours.map((h) => {
              const isSelected = selected === h;
              return (
                <button
                  key={h}
                  className={`slot${isSelected ? ' selected' : ''}`}
                  onClick={() => setSelected(h)}
                >
                  {String(h).padStart(2, '0')}:00
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div className="empty" style={{ padding: '24px 0' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🏸</div>
          <div>All slots booked for this date</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Try another date or join a game above</div>
        </div>
      )}

      {selected != null && (
        <>
          <p style={{ marginTop: 20, fontSize: 14 }}>
            Booking <strong>{court.name}</strong> on{' '}
            <strong>{date} at {String(selected).padStart(2, '0')}:00</strong>
          </p>
          {error && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>}

          {user ? (
            <div className="form">
              <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--muted)' }}>
                Booking as <strong>{user.name ?? user.email}</strong>.
              </p>

              {/* Need players toggle */}
              <div className="need-players-toggle">
                <button
                  type="button"
                  className={`toggle-opt ${!needPlayers ? 'active' : ''}`}
                  onClick={() => setNeedPlayers(false)}
                >
                  🏸 Solo booking
                </button>
                <button
                  type="button"
                  className={`toggle-opt ${needPlayers ? 'active' : ''}`}
                  onClick={() => setNeedPlayers(true)}
                >
                  👥 Need players
                </button>
              </div>

              {/* Slots picker */}
              {needPlayers && (
                <div className="slots-picker">
                  <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 8px' }}>
                    How many more players do you need?
                  </p>
                  <div className="slots-options">
                    {([1, 2, 3] as const).map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`slot-count-btn ${slotsNeeded === n ? 'active' : ''}`}
                        onClick={() => setSlotsNeeded(n)}
                      >
                        +{n} player{n > 1 ? 's' : ''}
                      </button>
                    ))}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
                    Your booking will appear in "Find a Game" for others to join.
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button className="btn" onClick={handleBook} disabled={submitting}>
                  {submitting
                    ? 'Booking…'
                    : needPlayers
                    ? `Book & Find Players`
                    : 'Confirm booking'}
                </button>
                <button className="btn ghost" onClick={() => { setSelected(null); setNeedPlayers(false); }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="signin-gate">
              <p>Sign in to confirm this booking.</p>
              <Link to="/auth/sign-in" className="btn">Sign in / Sign up</Link>
            </div>
          )}
        </>
      )}
    </>
  );
}
