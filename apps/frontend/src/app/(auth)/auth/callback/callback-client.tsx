'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'

export default function AuthCallbackClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth() // Use the login function to re-fetch user data
  const [hasProcessed, setHasProcessed] = useState(false)

  useEffect(() => {
    // Prevent multiple executions
    if (hasProcessed) {
      console.log('Callback already processed, skipping...')
      return
    }

    const handleCallback = async () => {
      // Tokens are now handled by HttpOnly cookies, so they won't be in searchParams
      // const token = searchParams.get('token')
      // const refreshToken = searchParams.get('refresh')
      const method = searchParams.get('method')
      const error = searchParams.get('error')
      const setupToken = searchParams.get('setup')
      const email = searchParams.get('email')

      console.log('OAuth Callback - Method:', method)
      console.log('OAuth Callback - Error:', error)

      setHasProcessed(true)

      if (error) {
        console.error('OAuth error:', error)
        router.push('/login?error=oauth_failed')
        return
      }

      // If backend indicates password creation is required, go to create-password
      if (method === 'google_invited' && setupToken) {
        router.push(`/create-password?token=${setupToken}${email ? `&email=${encodeURIComponent(email)}` : ''}`)
        return
      }

      // Assuming successful OAuth flow means cookies have been set by the backend
      // Trigger the login function from useAuth to re-fetch user data and update state
      console.log('OAuth successful, triggering login to fetch user data...')
      login() // This will call fetchUserData internally

      // Show success message based on login method
      let message = 'Login successful!'
      if (method === 'google_new') {
        message = 'Account created and logged in successfully!'
      } else if (method === 'google_linked') {
        message = 'Google account linked successfully!'
      }

      console.log('Redirecting to dashboard...')
      // Redirect to dashboard
      router.push('/dashboard')
    }

    handleCallback()
  }, [searchParams, router, login, hasProcessed])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-lg">Completing authentication...</p>
      </div>
    </div>
  )
}