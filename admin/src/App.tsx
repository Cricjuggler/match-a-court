import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import Nav from './components/Nav'
import LoginPage from './pages/login'
import SetupPage from './pages/setup'
import DashboardPage from './pages/dashboard'
import CourtsPage from './pages/courts'
import CourtReviewPage from './pages/court-review'
import BusinessesPage from './pages/businesses'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        Loading…
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
        Loading…
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/setup" element={user ? <Navigate to="/" replace /> : <SetupPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <div className="app">
              <Nav />
              <div className="main-content">
                <DashboardPage />
              </div>
            </div>
          </ProtectedRoute>
        }
      />

      <Route
        path="/courts"
        element={
          <ProtectedRoute>
            <div className="app">
              <Nav />
              <div className="main-content">
                <CourtsPage />
              </div>
            </div>
          </ProtectedRoute>
        }
      />

      <Route
        path="/courts/:id/review"
        element={
          <ProtectedRoute>
            <div className="app">
              <Nav />
              <div className="main-content">
                <CourtReviewPage />
              </div>
            </div>
          </ProtectedRoute>
        }
      />

      <Route
        path="/businesses"
        element={
          <ProtectedRoute>
            <div className="app">
              <Nav />
              <div className="main-content">
                <BusinessesPage />
              </div>
            </div>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
