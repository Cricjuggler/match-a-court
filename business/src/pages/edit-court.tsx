import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { apiFetch } from '../lib/api'
import CourtForm, { CourtFormData } from '../components/CourtForm'

interface Court extends CourtFormData {
  id: string
  status: string
}

export default function EditCourtPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [court, setCourt] = useState<Court | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    if (!id) return

    // Fetch court details — use the courts list and find by id,
    // or try a direct endpoint if available
    apiFetch<Court[]>('/api/business/courts')
      .then((courts) => {
        const found = courts.find((c) => c.id === id)
        if (!found) throw new Error('Court not found')
        setCourt(found)
      })
      .catch((err) => setFetchError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  async function handleSubmit(data: CourtFormData) {
    await apiFetch(`/api/business/courts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    navigate('/')
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${court?.name}"? This cannot be undone.`
    )
    if (!confirmed) return

    setDeleting(true)
    setDeleteError('')
    try {
      await apiFetch(`/api/business/courts/${id}`, { method: 'DELETE' })
      navigate('/')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed')
      setDeleting(false)
    }
  }

  return (
    <main className="page-content">
      <div className="page-header">
        <div>
          <h1>Edit Court</h1>
          {court && <p>{court.name}</p>}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {court && (
            <Link to={`/courts/${id}/bookings`} className="btn btn-ghost">
              View Bookings
            </Link>
          )}
          <Link to="/" className="btn btn-ghost">
            ← Back
          </Link>
        </div>
      </div>

      {loading && (
        <div style={{ color: 'var(--muted)', padding: '2rem' }}>Loading court…</div>
      )}

      {fetchError && <div className="form-error">{fetchError}</div>}

      {!loading && court && (
        <div style={{ maxWidth: 600 }}>
          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <CourtForm
              initialData={court}
              onSubmit={handleSubmit}
              submitLabel="Save Changes"
            />
          </div>

          {deleteError && <div className="form-error" style={{ marginBottom: '1rem' }}>{deleteError}</div>}

          <div
            className="card"
            style={{ borderColor: '#fee2e2', background: '#fff5f5' }}
          >
            <h3 style={{ fontSize: '0.95rem', color: '#991b1b', marginBottom: '0.5rem' }}>
              Danger Zone
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1rem' }}>
              Deleting this court is permanent and will remove all associated data.
            </p>
            <button
              className="btn btn-danger"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <span className="spinner" style={{ borderColor: 'rgba(220,38,38,0.3)', borderTopColor: '#dc2626' }} />
                  Deleting…
                </>
              ) : 'Delete Court'}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
