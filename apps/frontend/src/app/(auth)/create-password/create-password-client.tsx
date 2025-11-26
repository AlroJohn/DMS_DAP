"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/hooks/use-auth"

export default function CreatePasswordClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const emailParam = searchParams.get('email') || ''
  const { login } = useAuth() // Use the login function to re-fetch user data

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setError("Missing or invalid setup token.")
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error?.message || 'Failed to set password')
      } else {
        // Try auto-login if we have an email
        if (emailParam) {
          try {
            const loginRes = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: emailParam, password })
            })
            // If login is successful, cookies will be set. Trigger useAuth().login() to update state.
            if (loginRes.ok) {
              login() // Re-fetch user data and update auth state
              router.push('/dashboard')
              return
            }
          } catch {}
        }
        setSuccess('Password set successfully. Redirecting to login...')
        setTimeout(() => {
          router.push('/login?message=password_set')
        }, 800)
      }
    } catch (err) {
      setError('Failed to set password')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-svh flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create your password</CardTitle>
          <CardDescription>{emailParam ? `Account: ${emailParam}` : 'Set a password to finish setting up your account.'}</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4 border-destructive/40">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="mb-4 border-green-300">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel>New password</FieldLabel>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </Field>
              <Field>
                <FieldLabel>Confirm password</FieldLabel>
                <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              </Field>
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => router.push('/login')}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting || !token}>{isSubmitting ? 'Saving...' : 'Save password'}</Button>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}