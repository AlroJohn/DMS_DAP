'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface AuthContextType {
  isAuthenticated: boolean
  user: any | null
  login: () => void // Function to trigger re-fetch after login
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFetchingUser, setIsFetchingUser] = useState(false)

  useEffect(() => {
    fetchUserData();
  }, [])

  const fetchUserData = async () => {
    // Prevent multiple simultaneous requests
    if (isFetchingUser) {
      console.log('User data fetch already in progress, skipping...')
      return
    }

    setIsFetchingUser(true)
    try {
      // The browser will automatically send HttpOnly cookies to /api/auth/me
      const response = await fetch('/api/auth/me', {
        credentials: 'include', // Include cookies in the request
        headers: {
          'Cache-Control': 'no-cache'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.data)
        setIsAuthenticated(true)
        console.log('User data fetched successfully:', data.data?.email)
      } else {
        // 401/403 are expected when token is invalid/expired
        if (response.status === 401 || response.status === 403) {
          console.log('Session expired or invalid, please login again')
        } else {
          console.error('Failed to fetch user data:', response.status, response.statusText)
        }
        setIsAuthenticated(false)
        setUser(null)
      }
    } catch (error) {
      console.log('Unable to fetch user data, session may have expired')
      setIsAuthenticated(false)
      setUser(null)
    } finally {
      setIsLoading(false)
      setIsFetchingUser(false)
    }
  }

  const login = () => {
    // After a successful login (which sets HttpOnly cookies), re-fetch user data
    console.log('Login successful, re-fetching user data...')
    fetchUserData()
  }

  const logout = async () => {
    try {
      // Call the logout API endpoint, which will clear HttpOnly cookies
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include', // Include cookies in the request
        headers: {
          'Content-Type': 'application/json',
        },
      })
    } catch (error) {
      console.error('Logout API call failed:', error)
      // Continue with local cleanup even if API call fails
    } finally {
      // Always clean up local state
      setIsAuthenticated(false)
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
