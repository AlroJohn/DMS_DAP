'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import BlurText from "@/components/react-bits/BlurText"
import { useAuth } from '@/hooks/use-auth' // Import useAuth

interface InvitationData {
  email: string
  firstName: string
  lastName: string
  department: {
    name: string
  }
  role: {
    role_id: string;
    name: string;
    code: string;
    description: string;
    is_system_role: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    created_by: string;
    updated_by: string;
  }
  invitedBy: string
  expiresAt: string
}

export default function AcceptInvitationClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth() // Get the login function from useAuth
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [loadingInvitation, setLoadingInvitation] = useState(true)

  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link')
      setLoadingInvitation(false)
      return
    }

    fetchInvitation(token)
  }, [token])

  const fetchInvitation = async (invitationToken: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/invitations/${invitationToken}`)
      const data = await response.json()

      if (response.ok) {
        setInvitation(data.data)
      } else {
        setError(data.message || 'Invalid invitation')
      }
    } catch (error) {
      console.error('Error fetching invitation:', error)
      setError('Failed to load invitation')
    } finally {
      setLoadingInvitation(false)
    }
  }

  const handleAcceptInvitation = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!password || !confirmPassword) {
      setError('Please fill in all fields')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/invitations/${token}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // If tokens are provided, automatically log the user in
        // Now, tokens are set as HttpOnly cookies by the backend, so we just trigger login
        if (data.data?.token && data.data?.refreshToken) { // This condition might become redundant if backend stops returning tokens
          login() // Trigger useAuth().login() to re-fetch user data and update auth state
          // Redirect to dashboard
          router.push('/dashboard')
        } else {
          // Redirect to login page with success message
          router.push('/login?message=account_created')
        }
      } else {
        setError(data.message || 'Failed to create account')
      }
    } catch (error) {
      console.error('Error accepting invitation:', error)
      setError('Failed to create account. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (loadingInvitation) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg">Loading invitation...</p>
        </div>
      </div>
    )
  }

  if (error && !invitation) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-red-600">Invalid Invitation</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => router.push('/login')}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="relative bg-muted h-svh w-full overflow-hidden flex flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="relative z-10 flex w-full max-w-md flex-col gap-6">
        <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">
                <BlurText text="Welcome!" className="justify-center" />
              </CardTitle>
              <CardDescription>
                Complete your account setup
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invitation && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold mb-2">Invitation Details:</h3>
                  <p><strong>Name:</strong> {invitation.firstName} {invitation.lastName}</p>
                  <p><strong>Email:</strong> {invitation.email}</p>
                  <p><strong>Department:</strong> {invitation.department.name}</p>
                  <p><strong>Role:</strong> {invitation.role?.name || 'N/A'}</p>
                  <p><strong>Invited by:</strong> {invitation.invitedBy}</p>
                </div>
              )}

              <form onSubmit={handleAcceptInvitation}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </Field>
                  {error && (
                    <div className="text-red-600 text-sm text-center">
                      {error}
                    </div>
                  )}
                  <Field>
                    <Button type="submit" disabled={isLoading} className="w-full">
                      {isLoading ? 'Creating Account...' : 'Create Account'}
                    </Button>
                  </Field>
                </FieldGroup>
              </form>
            </CardContent>
          </Card>
      </div>
    </div>
  )
}