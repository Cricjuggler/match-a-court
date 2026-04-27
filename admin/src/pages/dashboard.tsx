import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../lib/api'

interface Owner {
  id: string
  businessName: string
  email: string
}

interface Court {
  id: string
  name: string
  location: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  owner?: Owner
}

interface Business {
  id: string
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function DashboardPage() {
  const [courts, setCourts] = useState<Court[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      apiFetch<Court[]>('/api/admin/courts'),
      apiFetch<Business[]>('/api/admin/businesses'),
    ])
      .then(([c, b]) => {
        setCourts(c)
        setBusinesses(b)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        Loading dashboard…
      </div>
    )
  }

  if (error) {
    return <div className="form-error">{error}</div>
  }

  const total = courts.length
  const pending = courts.filter((c) => c.status === 'pending')
  const approved = courts.filter((c) => c.status === 'approved')
  const rejected = courts.filter((c) => c.status === 'rejected')

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Overview of the Court Book platform</p>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-number">{total}</div>
          <div className="stat-label">Total Courts</div>
        </div>
        <div className={`stat-card ${pending.length > 0 ? 'highlight' : ''}`}>
          <div className="stat-number">{pending.length}</div>
          <div className="stat-label">Pending Review</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{approved.length}</div>
          <div className="stat-label">Approved</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{rejected.length}</div>
          <div className="stat-label">Rejected</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{businesses.length}</div>
          <div className="stat-label">Businesses</div>
        </div>
      </div>

      {/* Pending approvals */}
      <div className="section">
        <h2 className="section-title">
          Pending Approvals
          {pending.length > 0 && (
            <span
              style={{
                background: 'var(--warning-bg)',
                color: 'var(--warning)',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '0.15rem 0.5rem',
                borderRadius: '999px',
                border: '1px solid #fde68a',
              }}
            >
              {pending.length}
            </span>
          )}
        </h2>

        {pending.length === 0 ? (
          <div className="empty">
            <span className="empty-icon">🎉</span>
            <div className="empty-title">All caught up!</div>
            <div className="empty-desc">No courts are waiting for review.</div>
          </div>
        ) : (
          <div className="pending-list">
            {pending.map((court) => (
              <div key={court.id} className="pending-item">
                <div className="pending-item-info">
                  <div className="pending-item-name">{court.name}</div>
                  <div className="pending-item-meta">
                    {court.owner?.businessName && (
                      <span>{court.owner.businessName} · </span>
                    )}
                    {court.location && (
                      <span>{court.location} · </span>
                    )}
                    Submitted {formatDate(court.createdAt)}
                  </div>
                </div>
                <Link
                  to={`/courts/${court.id}/review`}
                  className="btn btn-primary btn-sm"
                >
                  Review
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="section">
        <h2 className="section-title">Quick Actions</h2>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/courts" className="btn btn-secondary">
            View All Courts
          </Link>
          <Link to="/businesses" className="btn btn-secondary">
            View All Businesses
          </Link>
          {pending.length > 0 && (
            <Link
              to="/courts?status=pending"
              className="btn btn-primary"
            >
              Review Pending ({pending.length})
            </Link>
          )}
        </div>
      </div>
    </>
  )
}
