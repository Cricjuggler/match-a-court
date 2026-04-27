import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { apiFetch } from '../lib/api'
import StatusBadge from '../components/StatusBadge'

interface Court {
  id: string
  name: string
  location: string
}

interface Booking {
  id: string
  date: string
  startTime: string
  endTime: string
  userId: string
  userEmail?: string
  status: string
  createdAt: string
}

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function todayString() {
  return new Date().toISOString().split('T')[0]
}

export default function CourtBookingsPage() {
  const { id } = useParams<{ id: string }>()

  const [court, setCourt] = useState<Court | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [date, setDate] = useState(todayString())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [cancelError, setCancelError] = useState('')

  // Load court name
  useEffect(() => {
    if (!id) return
    apiFetch<Court[]>('/api/business/courts')
      .then((courts) => {
        const found = courts.find((c) => c.id === id)
        if (found) setCourt(found)
      })
      .catch(() => {})
  }, [id])

  const loadBookings = useCallback(() => {
    if (!id) return
    setLoading(true)
    setError('')
    apiFetch<Booking[]>(`/api/business/courts/${id}/bookings?date=${date}`)
      .then(setBookings)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id, date])

  useEffect(() => {
    loadBookings()
  }, [loadBookings])

  async function handleCancel(bookingId: string) {
    const confirmed = window.confirm('Cancel this booking? The player will be notified.')
    if (!confirmed) return

    setCancellingId(bookingId)
    setCancelError('')
    try {
      await apiFetch(`/api/business/bookings/${bookingId}`, { method: 'DELETE' })
      setBookings((prev) => prev.filter((b) => b.id !== bookingId))
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Cancel failed')
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <main className="page-content">
      <div className="page-header">
        <div>
          <h1>Bookings</h1>
          {court && (
            <p>
              {court.name} — {court.location}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link to={`/courts/${id}/edit`} className="btn btn-ghost btn-sm">
            Edit Court
          </Link>
          <Link to="/" className="btn btn-ghost btn-sm">
            ← Dashboard
          </Link>
        </div>
      </div>

      {/* Date filter */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <label
            htmlFor="date-filter"
            style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)' }}
          >
            Filter by date:
          </label>
          <input
            id="date-filter"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              padding: '0.45rem 0.75rem',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '0.875rem',
              color: 'var(--text)',
              background: 'var(--surface)',
              fontFamily: 'inherit',
            }}
          />
          <button className="btn btn-secondary btn-sm" onClick={loadBookings}>
            Refresh
          </button>
        </div>
      </div>

      {cancelError && (
        <div className="form-error" style={{ marginBottom: '1rem' }}>
          {cancelError}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading && (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--muted)' }}>
            Loading bookings…
          </div>
        )}

        {!loading && error && (
          <div style={{ padding: '1.5rem' }}>
            <div className="form-error">{error}</div>
          </div>
        )}

        {!loading && !error && bookings.length === 0 && (
          <div className="empty">
            <span className="empty-icon">📅</span>
            <h3>No bookings for this date</h3>
            <p>No one has booked this court on {date}.</p>
          </div>
        )}

        {!loading && !error && bookings.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time Slot</th>
                  <th>Player</th>
                  <th>Booked At</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td>{booking.date}</td>
                    <td>
                      {booking.startTime} – {booking.endTime}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>
                        {booking.userEmail ?? booking.userId}
                      </div>
                      {booking.userEmail && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                          ID: {booking.userId}
                        </div>
                      )}
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
                      {formatDateTime(booking.createdAt)}
                    </td>
                    <td>
                      <StatusBadge status={booking.status} />
                    </td>
                    <td>
                      {booking.status !== 'cancelled' && booking.status !== 'rejected' ? (
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleCancel(booking.id)}
                          disabled={cancellingId === booking.id}
                        >
                          {cancellingId === booking.id ? 'Cancelling…' : 'Cancel'}
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && bookings.length > 0 && (
        <div style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: 'var(--muted)' }}>
          {bookings.length} booking{bookings.length !== 1 ? 's' : ''} on {date}
        </div>
      )}
    </main>
  )
}
