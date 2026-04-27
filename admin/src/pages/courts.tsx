import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { apiFetch } from '../lib/api'
import StatusBadge from '../components/StatusBadge'

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
  surface?: string
  indoor?: boolean
  photos?: string[]
  bookingCount?: number
  createdAt: string
  owner?: Owner
}

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected'

const TABS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
]

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function CourtsPage() {
  const [courts, setCourts] = useState<Court[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = (searchParams.get('status') as StatusFilter) || 'all'

  useEffect(() => {
    setLoading(true)
    apiFetch<Court[]>('/api/admin/courts')
      .then(setCourts)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load courts')
      })
      .finally(() => setLoading(false))
  }, [])

  function setTab(tab: StatusFilter) {
    if (tab === 'all') {
      setSearchParams({})
    } else {
      setSearchParams({ status: tab })
    }
  }

  const counts: Record<StatusFilter, number> = {
    all: courts.length,
    pending: courts.filter((c) => c.status === 'pending').length,
    approved: courts.filter((c) => c.status === 'approved').length,
    rejected: courts.filter((c) => c.status === 'rejected').length,
  }

  const filtered =
    activeTab === 'all'
      ? courts
      : courts.filter((c) => c.status === activeTab)

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Courts</h1>
        <p className="page-subtitle">All court listings submitted by businesses</p>
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            className={`tab-item ${activeTab === tab.value ? 'active' : ''}`}
            onClick={() => setTab(tab.value)}
          >
            {tab.label}
            <span className="tab-count">{counts[tab.value]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner" />
          Loading courts…
        </div>
      ) : error ? (
        <div className="form-error">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <span className="empty-icon">🏸</span>
          <div className="empty-title">No courts found</div>
          <div className="empty-desc">
            {activeTab === 'all'
              ? 'No courts have been submitted yet.'
              : `No ${activeTab} courts.`}
          </div>
        </div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 64 }}>Photo</th>
                <th>Name</th>
                <th>Location</th>
                <th>Owner Business</th>
                <th>Status</th>
                <th>Bookings</th>
                <th>Submitted</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((court) => {
                const thumb = court.photos?.[0]
                return (
                  <tr key={court.id}>
                    <td>
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={court.name}
                          className="table-thumb"
                        />
                      ) : (
                        <div className="table-thumb-placeholder">🏸</div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{court.name}</div>
                      {court.surface && (
                        <div className="td-muted">{court.surface}</div>
                      )}
                    </td>
                    <td className="td-muted">{court.location || '—'}</td>
                    <td>
                      {court.owner ? (
                        <>
                          <div style={{ fontWeight: 500 }}>
                            {court.owner.businessName}
                          </div>
                          <div className="td-muted">{court.owner.email}</div>
                        </>
                      ) : (
                        <span className="td-muted">—</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={court.status} />
                    </td>
                    <td className="td-muted">
                      {court.bookingCount ?? 0}
                    </td>
                    <td className="td-muted">{formatDate(court.createdAt)}</td>
                    <td>
                      <Link
                        to={`/courts/${court.id}/review`}
                        className="btn btn-secondary btn-sm"
                      >
                        Review
                      </Link>
                    </td>
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
