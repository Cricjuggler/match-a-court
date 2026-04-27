import { useNavigate, Link } from 'react-router-dom'
import { apiFetch } from '../lib/api'
import CourtForm, { CourtFormData } from '../components/CourtForm'

export default function AddCourtPage() {
  const navigate = useNavigate()

  async function handleSubmit(data: CourtFormData) {
    await apiFetch('/api/business/courts', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    navigate('/')
  }

  return (
    <main className="page-content">
      <div className="page-header">
        <div>
          <h1>Add New Court</h1>
          <p>Fill in the details to list your court</p>
        </div>
        <Link to="/" className="btn btn-ghost">
          ← Back
        </Link>
      </div>

      <div className="card" style={{ maxWidth: 600 }}>
        <CourtForm onSubmit={handleSubmit} submitLabel="Add Court" />
      </div>
    </main>
  )
}
