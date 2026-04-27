import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch, clearToken, getToken, setToken } from './api'

export interface BusinessUser {
  id: string
  email: string
  businessName: string
}

interface AuthContextValue {
  user: BusinessUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<BusinessUser>
  register: (
    email: string,
    password: string,
    businessName: string,
    phone: string
  ) => Promise<BusinessUser>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthResponse {
  token: string
  user: BusinessUser
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<BusinessUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  // On mount: validate stored token
  useEffect(() => {
    const token = getToken()
    if (!token) {
      setIsLoading(false)
      return
    }

    apiFetch<BusinessUser>('/api/business/me')
      .then((u) => setUser(u))
      .catch(() => {
        clearToken()
      })
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<AuthResponse>('/api/business/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setToken(data.token)
    setUser(data.user)
    return data.user
  }, [])

  const register = useCallback(
    async (email: string, password: string, businessName: string, phone: string) => {
      const data = await apiFetch<AuthResponse>('/api/business/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, businessName, phone }),
      })
      setToken(data.token)
      setUser(data.user)
      return data.user
    },
    []
  )

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
    navigate('/login')
  }, [navigate])

  const value: AuthContextValue = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    login,
    register,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
