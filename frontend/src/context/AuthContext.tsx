// This is the "global state" for login
// Any component in the app can use useAuth() to get the logged-in user's info
// or call login() / logout()

import React, { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/axios'

// What a User looks like
interface User {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'PM' | 'DEVELOPER'
}

// What the AuthContext provides
interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loading: boolean
}

// Create the context (starts empty)
const AuthContext = createContext<AuthContextType | null>(null)

// This is the Provider component - wraps the whole app
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // The logged-in user. null means not logged in.
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // When the app first loads, check if user is already logged in
  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    const savedToken = localStorage.getItem('accessToken')

    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser))
    }

    setLoading(false)
  }, [])

  // Call this when user submits the login form
  async function login(email: string, password: string) {
    const response = await api.post('/auth/login', { email, password })
    const { accessToken, user: userData } = response.data

    // Save token and user to localStorage so they survive page refresh
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('user', JSON.stringify(userData))

    setUser(userData)
  }

  // Call this when user clicks logout
  async function logout() {
    try {
      await api.post('/auth/logout')
    } catch (err) {
      // Even if the request fails, we still clear local data
    }

    localStorage.removeItem('accessToken')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook - any component calls useAuth() to get user info
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
