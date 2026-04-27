import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function SetupPage() {
  const { setup } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [adminExists, setAdminExists] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setAdminExists(false)
    setSubmitting(true)
    try {
      await setup(email, password, name)
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const status = (err as { status?: number }).status
      if (status === 403) {
        setAdminExists(true)
      } else {
        setError(err instanceof Error ? err.message : 'Setup failed')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-icon">🏸</div>
          <div className="auth-brand-title">Court Book</div>
          <div className="auth-brand-subtitle">First-Time Setup</div>
        </div>

        {adminExists ? (
          <div style={{ textAlign: 'center' }}>
            <div className="info-box" style={{ marginBottom: '1rem' }}>
              An admin account already exists. Please sign in instead.
            </div>
            <Link to="/login" className="btn btn-primary" style={{ display: 'inline-flex' }}>
              Go to Login
            </Link>
          </div>
        ) : (
          <>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '1.25rem' }}>
              Create the first administrator account. This form will only work once — when no admins exist yet.
            </p>

            <form className="form" onSubmit={handleSubmit}>
              <label>
                Full Name
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  autoFocus
                />
              </label>

              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                />
              </label>

              <label>
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Choose a strong password"
                  required
                  minLength={8}
                />
              </label>

              {error && <div className="form-error">{error}</div>}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
                style={{ marginTop: '0.25rem' }}
              >
                {submitting ? 'Creating account…' : 'Create Admin Account'}
              </button>
            </form>

            <div className="auth-footer">
              Already have an account?{' '}
              <Link to="/login">Sign in</Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
