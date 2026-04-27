import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Court } from '../types';
import { apiFetch } from '../lib/api';
import { Slideshow } from '../components/Slideshow';

export function Home() {
  const [courts, setCourts] = useState<Court[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/api/courts')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then(setCourts)
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <>
      <h2>Find a court</h2>
      <p className="subtitle">Pick a badminton court to see available times.</p>
      {error && <div className="empty" style={{ color: 'var(--danger)' }}>Error: {error}</div>}
      {courts === null ? (
        <div className="empty">Loading…</div>
      ) : courts.length === 0 ? (
        <div className="empty">No courts yet.</div>
      ) : (
        <div className="grid">
          {courts.map((c) => {
            const photos = c.photoUrls?.length ? c.photoUrls : c.photoUrl ? [c.photoUrl] : [];
            return (
              <Link
                key={c.id}
                to={`/courts/${c.id}`}
                className="card court-card"
                style={{ display: 'block', color: 'inherit' }}
              >
                {photos.length > 0 && (
                  <div className="court-photo">
                    <Slideshow urls={photos} alt={c.name} />
                  </div>
                )}
                <div className="court-info">
                  <h3>{c.name}</h3>
                  <div className="meta">
                    {c.location} · {c.surface} · {c.indoor ? 'Indoor' : 'Outdoor'}
                  </div>
                  <div className="meta" style={{ marginTop: 6 }}>
                    Open {String(c.openHour).padStart(2,'0')}:00 – {String(c.closeHour).padStart(2,'0')}:00
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
