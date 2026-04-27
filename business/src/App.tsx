import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import Nav from './components/Nav'
import LoginPage from './pages/login'
import RegisterPage from './pages/register'
import DashboardPage from './pages/dashboard'
import AddCourtPage from './pages/add-court'
import EditCourtPage from './pages/edit-court'
import CourtBookingsPage from './pages/court-bookings'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner" style={{ borderColor: 'rgba(37,99,235,0.2)', borderTopColor: '#2563eb' }} />
        <span>Loading…</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="app">
      <Nav />
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
        />
        <Route
          path="/register"
          element={isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />}
        />
        <Route
          path="/courts/new"
          element={
            <ProtectedRoute>
              <AddCourtPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/courts/:id/edit"
          element={
            <ProtectedRoute>
              <EditCourtPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/courts/:id/bookings"
          element={
            <ProtectedRoute>
              <CourtBookingsPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
