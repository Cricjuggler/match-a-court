import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { apiFetch } from '../lib/api'
import StatusBadge from '../components/StatusBadge'

interface Court {
  id: string
  name: string
  location: string
  surface: string
  indoor: boolean
  openHour: number
  closeHour: number
  photoUrl: string
  status: string
  bookingCount?: number
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [courts, setCourts] = useState<Court[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch<Court[]>('/api/business/courts')
      .then(setCourts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="page-content">
      <div className="page-header">
        <div>
          <h1>Welcome, {user?.businessName ?? 'Business'}</h1>
          <p>Manage your courts and view bookings</p>
        </div>
        <Link to="/courts/new" className="btn btn-primary">
          + Add New Court
        </Link>
      </div>

      {loading && (
        <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '3rem' }}>
          Loading courts…
        </div>
      )}

      {error && <div className="form-error">{error}</div>}

      {!loading && !error && courts.length === 0 && (
        <div className="card">
          <div className="empty">
            <span className="empty-icon">🏟️</span>
            <h3>No courts listed yet</h3>
            <p>Start by adding your first badminton court to attract players.</p>
            <Link to="/courts/new" className="btn btn-primary">
              List your first court
            </Link>
          </div>
        </div>
      )}

      {!loading && courts.length > 0 && (
        <div className="courts-grid">
          {courts.map((court) => (
            <CourtCard key={court.id} court={court} />
          ))}
        </div>
      )}
    </main>
  )
}

function CourtCard({ court }: { court: Court }) {
  return (
    <div className="court-card">
      <div className="court-photo">
        {court.photoUrl ? (
          <img
            src={court.photoUrl}
            alt={court.name}
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
              if (target.parentElement) {
                target.parentElement.textContent = '🏸'
              }
            }}
          />
        ) : (
          '🏸'
        )}
      </div>

      <div className="court-info">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <h3 style={{ margin: 0 }}>{court.name}</h3>
          <StatusBadge status={court.status ?? 'pending'} />
        </div>

        <div className="court-location">📍 {court.location}</div>

        <div className="court-meta">
          <span>{court.surface}</span>
          <span>•</span>
          <span>{court.indoor ? '🏠 Indoor' : '☀️ Outdoor'}</span>
          <span>•</span>
          <span>{court.openHour}:00 – {court.closeHour}:00</span>
        </div>

        {court.bookingCount !== undefined && (
          <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
            {court.bookingCount} booking{court.bookingCount !== 1 ? 's' : ''}
          </div>
        )}

        <div className="court-actions">
          <Link
            to={`/courts/${court.id}/edit`}
            className="btn btn-secondary btn-sm"
          >
            Edit
          </Link>
          <Link
            to={`/courts/${court.id}/bookings`}
            className="btn btn-ghost btn-sm"
          >
            View Bookings
          </Link>
        </div>
      </div>
    </div>
  )
}
