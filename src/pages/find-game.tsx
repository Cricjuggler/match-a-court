import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useSession } from '../lib/useSession';

interface GroupBooking {
  id: string;
  hostName: string;
  date: string;
  startHour: number;
  slotsNeeded: number;
  joinedCount: number;
  spotsLeft: number;
  courtId: string;
  courtName: string;
  courtLocation: string;
  courtSurface: string;
  courtIndoor: boolean;
  courtPhoto: string | null;
}

const DRAG_THRESHOLD = 90;
const PLACEHOLDER = 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=600&h=400&fit=crop';

// ── Swipe Card ───────────────────────────────────────────────────────────────

function SwipeCard({
  game,
  onJoin,
  onSkip,
  isTop,
  index,
}: {
  game: GroupBooking;
  onJoin: () => void;
  onSkip: () => void;
  isTop: boolean;
  index: number;
}) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [flying, setFlying] = useState<'left' | 'right' | null>(null);
  const dragStart = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const fly = useCallback(
    (dir: 'left' | 'right') => {
      setFlying(dir);
      setTimeout(() => {
        dir === 'right' ? onJoin() : onSkip();
      }, 280);
    },
    [onJoin, onSkip]
  );

  // Mouse handlers
  const onMouseDown = (e: React.MouseEvent) => {
    if (!isTop) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
  };

  useEffect(() => {
    if (!isTop) return;
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      setPos({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
    };
    const onMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      setPos((p) => {
        if (Math.abs(p.x) > DRAG_THRESHOLD) fly(p.x > 0 ? 'right' : 'left');
        else setPos({ x: 0, y: 0 });
        return p;
      });
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isTop, fly]);

  // Touch handlers
  const onTouchStart = (e: React.TouchEvent) => {
    if (!isTop) return;
    const t = e.touches[0];
    dragStart.current = { x: t.clientX, y: t.clientY };
    isDragging.current = true;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const t = e.touches[0];
    setPos({ x: t.clientX - dragStart.current.x, y: t.clientY - dragStart.current.y });
  };
  const onTouchEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    setPos((p) => {
      if (Math.abs(p.x) > DRAG_THRESHOLD) fly(p.x > 0 ? 'right' : 'left');
      else setTimeout(() => setPos({ x: 0, y: 0 }), 0);
      return p;
    });
  };

  const rotation = pos.x * 0.06;
  const overlayOpacity = Math.min(Math.abs(pos.x) / DRAG_THRESHOLD, 1);

  let transform = `translate(${pos.x}px, ${pos.y}px) rotate(${rotation}deg)`;
  let transition = isDragging.current ? 'none' : 'transform 0.3s cubic-bezier(.17,.67,.36,1.2)';

  if (flying === 'right') {
    transform = 'translate(140vw, -40px) rotate(22deg)';
    transition = 'transform 0.28s ease-in';
  } else if (flying === 'left') {
    transform = 'translate(-140vw, -40px) rotate(-22deg)';
    transition = 'transform 0.28s ease-in';
  }

  // Stacking offset for cards behind
  const stackScale = 1 - index * 0.04;
  const stackY = index * 12;
  const baseTransform = isTop
    ? transform
    : `translateY(${stackY}px) scale(${stackScale})`;
  const baseTransition = isTop ? transition : 'transform 0.3s ease';
  const zIndex = 10 - index;

  const weekday = new Date(game.date + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  });

  return (
    <div
      ref={cardRef}
      className="swipe-card"
      style={{ transform: baseTransform, transition: baseTransition, zIndex, cursor: isTop ? 'grab' : 'default' }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Court photo */}
      <div className="swipe-photo">
        <img
          src={game.courtPhoto || PLACEHOLDER}
          alt={game.courtName}
          draggable={false}
          onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER; }}
        />
        {/* Swipe overlays */}
        {isTop && pos.x > 20 && (
          <div className="swipe-overlay join" style={{ opacity: overlayOpacity }}>
            <span>JOIN ✓</span>
          </div>
        )}
        {isTop && pos.x < -20 && (
          <div className="swipe-overlay skip" style={{ opacity: overlayOpacity }}>
            <span>SKIP ✗</span>
          </div>
        )}
        {/* Spots badge */}
        <div className="swipe-spots-badge">
          {'🏸 '.repeat(game.spotsLeft)}{game.spotsLeft} spot{game.spotsLeft !== 1 ? 's' : ''} left
        </div>
      </div>

      {/* Info */}
      <div className="swipe-info">
        <div className="swipe-court-name">{game.courtName}</div>
        <div className="swipe-meta">{game.courtLocation} · {game.courtSurface} · {game.courtIndoor ? 'Indoor' : 'Outdoor'}</div>
        <div className="swipe-datetime">
          <span className="swipe-date">📅 {weekday}</span>
          <span className="swipe-time">🕐 {String(game.startHour).padStart(2, '0')}:00 – {String(game.startHour + 1).padStart(2, '0')}:00</span>
        </div>
        <div className="swipe-host">Hosted by <strong>{game.hostName}</strong></div>
        <div className="player-slots">
          {Array.from({ length: game.slotsNeeded + 1 }).map((_, i) => (
            <div
              key={i}
              className={`player-slot ${i === 0 ? 'slot-host' : i <= game.joinedCount ? 'slot-joined' : 'slot-empty'}`}
              title={i === 0 ? 'Host' : i <= game.joinedCount ? 'Joined' : 'Open spot'}
            />
          ))}
          <span className="slot-label">{game.joinedCount}/{game.slotsNeeded} joined</span>
        </div>
      </div>
    </div>
  );
}

// ── Find Game Page ───────────────────────────────────────────────────────────

export function FindGame() {
  const { user, loading: sessionLoading } = useSession();
  const [games, setGames] = useState<GroupBooking[] | null>(null);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [joining, setJoining] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!user) return;
    apiFetch('/api/group-bookings')
      .then((r) => r.json())
      .then(setGames)
      .catch(() => setGames([]));
  }, [user]);

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  const visible = (games ?? []).filter((g) => !skipped.has(g.id));

  async function handleJoin(game: GroupBooking) {
    if (joining) return;
    setJoining(true);
    try {
      const r = await apiFetch(`/api/group-bookings/${game.id}/join`, {
        method: 'POST',
        body: JSON.stringify({ userName: user?.name ?? user?.email ?? 'Player' }),
      });
      if (r.status === 409) {
        const err = await r.json();
        showToast(err.error ?? 'Already full', 'error');
      } else if (!r.ok) {
        showToast('Something went wrong', 'error');
      } else {
        showToast(`🎉 You're in! ${game.courtName} on ${game.date} at ${String(game.startHour).padStart(2,'0')}:00`, 'success');
      }
    } finally {
      setJoining(false);
      setSkipped((s) => new Set([...s, game.id]));
    }
  }

  function handleSkip(gameId: string) {
    setSkipped((s) => new Set([...s, gameId]));
  }

  if (sessionLoading) return <div className="empty">Loading…</div>;

  if (!user) {
    return (
      <>
        <h2>Find a Game</h2>
        <div className="signin-gate">
          <p>Sign in to find players and join open games.</p>
          <Link to="/auth/sign-in" className="btn">Sign in / Sign up</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <h2>Find a Game</h2>
      <p className="subtitle">Swipe right to join · Swipe left to skip</p>

      {/* Toast */}
      {toast && (
        <div className={`swipe-toast ${toast.type}`}>{toast.msg}</div>
      )}

      {games === null ? (
        <div className="empty">Finding games…</div>
      ) : visible.length === 0 ? (
        <div className="swipe-empty">
          <div className="swipe-empty-icon">🏸</div>
          <h3>No open games right now</h3>
          <p>Be the first — book a court and invite players.</p>
          <Link to="/" className="btn" style={{ marginTop: 12 }}>Book a court</Link>
        </div>
      ) : (
        <>
          {/* Card stack */}
          <div className="swipe-stack">
            {visible.slice(0, 3).map((game, i) => (
              <SwipeCard
                key={game.id}
                game={game}
                isTop={i === 0}
                index={i}
                onJoin={() => handleJoin(game)}
                onSkip={() => handleSkip(game.id)}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="swipe-actions">
            <button
              className="swipe-btn skip-btn"
              onClick={() => visible[0] && handleSkip(visible[0].id)}
              title="Skip"
            >✗</button>
            <span className="swipe-hint">{visible.length} game{visible.length !== 1 ? 's' : ''} available</span>
            <button
              className="swipe-btn join-btn"
              onClick={() => visible[0] && handleJoin(visible[0])}
              disabled={joining}
              title="Join"
            >✓</button>
          </div>
        </>
      )}
    </>
  );
}
