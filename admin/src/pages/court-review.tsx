import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { apiFetch } from '../lib/api'
import StatusBadge from '../components/StatusBadge'

interface Owner {
  id: string
  businessName: string
  email: string
  phone?: string
}

interface Court {
  id: string
  name: string
  location: string
  status: 'pending' | 'approved' | 'rejected'
  surface?: string
  indoor?: boolean
  openTime?: string
  closeTime?: string
  description?: string
  photos?: string[]
  reviewNote?: string
  reviewedAt?: string
  createdAt: string
  owner?: Owner
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function CourtReviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [court, setCourt] = useState<Court | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    apiFetch<Court[]>('/api/admin/courts')
      .then((courts) => {
        const found = courts.find((c) => c.id === id)
        if (!found) {
          setError('Court not found.')
        } else {
          setCourt(found)
          if (found.reviewNote) setNote(found.reviewNote)
        }
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load courts')
      })
      .finally(() => setLoading(false))
  }, [id])

  async function submitReview(status: 'approved' | 'rejected') {
    if (!court) return
    setSubmitError('')
    setSubmitting(true)
    try {
      await apiFetch(`/api/admin/courts/${court.id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ status, note: note.trim() || undefined }),
      })
      navigate('/courts', { replace: true })
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        Loading court…
      </div>
    )
  }

  if (error || !court) {
    return (
      <>
        <Link to="/courts" className="back-link">← Back to Courts</Link>
        <div className="form-error">{error || 'Court not found.'}</div>
      </>
    )
  }

  const isPending = court.status === 'pending'
  const mainPhoto = court.photos?.[0]

  return (
    <>
      <Link to="/courts" className="back-link">← Back to Courts</Link>

      <div className="page-header">
        <h1 className="page-title">Review Court</h1>
        <p className="page-subtitle">
          {isPending
            ? 'Approve or reject this court listing'
            : 'View or update this court\'s review decision'}
        </p>
      </div>

      {/* Court Detail Card */}
      <div className="court-detail-card">
        {mainPhoto ? (
          <img
            src={mainPhoto}
            alt={court.name}
            className="court-detail-photo"
          />
        ) : (
          <div className="court-detail-photo-placeholder">🏸</div>
        )}

        <div className="court-detail-body">
          <div
            style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.25rem' }}
          >
            <h2 className="court-detail-name">{court.name}</h2>
            <StatusBadge status={court.status} />
          </div>

          {court.location && (
            <div className="court-detail-location">📍 {court.location}</div>
          )}

          {court.description && (
            <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: '1.25rem' }}>
              {court.description}
            </p>
          )}

          <div className="court-detail-grid">
            {court.surface && (
              <div className="court-detail-field">
                <span className="court-detail-field-key">Surface</span>
                <span className="court-detail-field-value">{court.surface}</span>
              </div>
            )}
            <div className="court-detail-field">
              <span className="court-detail-field-key">Type</span>
              <span className="court-detail-field-value">
                {court.indoor !== undefined
                  ? court.indoor
                    ? 'Indoor'
                    : 'Outdoor'
                  : '—'}
              </span>
            </div>
            {(court.openTime || court.closeTime) && (
              <div className="court-detail-field">
                <span className="court-detail-field-key">Hours</span>
                <span className="court-detail-field-value">
                  {court.openTime ?? '?'} – {court.closeTime ?? '?'}
                </span>
              </div>
            )}
            <div className="court-detail-field">
              <span className="court-detail-field-key">Submitted</span>
              <span className="court-detail-field-value">{formatDate(court.createdAt)}</span>
            </div>
          </div>

          {court.owner && (
            <>
              <hr className="court-detail-divider" />
              <div className="court-detail-section-title">Owner Information</div>
              <div className="court-detail-grid">
                <div className="court-detail-field">
                  <span className="court-detail-field-key">Business</span>
                  <span className="court-detail-field-value">{court.owner.businessName}</span>
                </div>
                <div className="court-detail-field">
                  <span className="court-detail-field-key">Email</span>
                  <span className="court-detail-field-value">{court.owner.email}</span>
                </div>
                {court.owner.phone && (
                  <div className="court-detail-field">
                    <span className="court-detail-field-key">Phone</span>
                    <span className="court-detail-field-value">{court.owner.phone}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Review Panel */}
      <div className="review-panel">
        <div className="review-panel-title">
          {isPending ? 'Make a Decision' : 'Review Decision'}
        </div>

        {/* Show existing decision if already reviewed */}
        {!isPending && (
          <div className="review-existing">
            <div className="review-existing-row">
              <span className="review-existing-key">Status:</span>
              <StatusBadge status={court.status} />
            </div>
            {court.reviewNote && (
              <div className="review-existing-row">
                <span className="review-existing-key">Note:</span>
                <span>{court.reviewNote}</span>
              </div>
            )}
            {court.reviewedAt && (
              <div className="review-existing-row">
                <span className="review-existing-key">Reviewed:</span>
                <span>{formatDate(court.reviewedAt)}</span>
              </div>
            )}
          </div>
        )}

        {/* Note textarea (always shown for updates) */}
        <div>
          <span className="review-note-label">
            {isPending ? 'Note (optional)' : 'Update note (optional)'}
          </span>
          <textarea
            className="review-note-textarea"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note about your decision…"
          />
        </div>

        {submitError && (
          <div className="form-error" style={{ marginTop: '0.75rem' }}>
            {submitError}
          </div>
        )}

        <div className="review-actions">
          <button
            className="btn btn-success"
            onClick={() => submitReview('approved')}
            disabled={submitting}
          >
            {submitting ? 'Saving…' : '✅ Approve'}
          </button>
          <button
            className="btn btn-danger"
            onClick={() => submitReview('rejected')}
            disabled={submitting}
          >
            {submitting ? 'Saving…' : '❌ Reject'}
          </button>
          <Link to="/courts" className="btn btn-ghost">
            Cancel
          </Link>
        </div>
      </div>
    </>
  )
}
