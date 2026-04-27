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

  useEffect(() => {
    if (!id) return;
    apiFetch(`/api/courts/${id}`).then(async (r) => {
      if (r.status === 404) setNotFound(true);
      else if (r.ok) setCourt(await r.json());
    });
  }, [id]);

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
    for (let h = court.openHour; h < court.closeHour; h++) out.push(h);
    return out;
  }, [court]);

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

      <div className="legend">
        <span><span className="dot" style={{ background: 'var(--free)' }} /> Available</span>
        <span><span className="dot" style={{ background: 'var(--booked)' }} /> Booked</span>
        <span><span className="dot" style={{ background: 'var(--accent)' }} /> Selected</span>
      </div>

      <div className="slot-grid">
        {hours.map((h) => {
          const booked = bookedHours.has(h);
          const isSelected = selected === h;
          const cls = ['slot'];
          if (booked) cls.push('booked');
          if (isSelected) cls.push('selected');
          return (
            <button
              key={h}
              className={cls.join(' ')}
              disabled={booked}
              onClick={() => setSelected(h)}
            >
              {String(h).padStart(2, '0')}:00
            </button>
          );
        })}
      </div>

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
