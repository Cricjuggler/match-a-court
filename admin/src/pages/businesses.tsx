import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'

interface Court {
  id: string
  ownerId?: string
}

interface Business {
  id: string
  businessName: string
  email: string
  phone?: string
  createdAt: string
  courtCount?: number
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [courts, setCourts] = useState<Court[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      apiFetch<Business[]>('/api/admin/businesses'),
      apiFetch<Court[]>('/api/admin/courts'),
    ])
      .then(([b, c]) => {
        setBusinesses(b)
        setCourts(c)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      })
      .finally(() => setLoading(false))
  }, [])

  function getCourtCount(businessId: string): number {
    return courts.filter((c) => c.ownerId === businessId).length
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Businesses</h1>
        <p className="page-subtitle">All registered business accounts on the platform</p>
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner" />
          Loading businesses…
        </div>
      ) : error ? (
        <div className="form-error">{error}</div>
      ) : businesses.length === 0 ? (
        <div className="empty">
          <span className="empty-icon">🏢</span>
          <div className="empty-title">No businesses registered yet</div>
          <div className="empty-desc">
            Businesses will appear here once they sign up on the platform.
          </div>
        </div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Business Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Courts</th>
                <th>Registered</th>
              </tr>
            </thead>
            <tbody>
              {businesses.map((biz) => {
                const courtCount =
                  biz.courtCount !== undefined
                    ? biz.courtCount
                    : getCourtCount(biz.id)
                return (
                  <tr key={biz.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{biz.businessName}</div>
                    </td>
                    <td className="td-muted">{biz.email}</td>
                    <td className="td-muted">{biz.phone || '—'}</td>
                    <td>
                      <span
                        style={{
                          background: courtCount > 0 ? 'var(--accent-light)' : 'var(--bg)',
                          color: courtCount > 0 ? 'var(--accent)' : 'var(--muted)',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          padding: '0.15rem 0.55rem',
                          borderRadius: '999px',
                          border: '1px solid var(--border)',
                        }}
                      >
                        {courtCount}
                      </span>
                    </td>
                    <td className="td-muted">{formatDate(biz.createdAt)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
