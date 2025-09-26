"use client"

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

function ResetPasswordInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [parsing, setParsing] = useState(true)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [debugInfo, setDebugInfo] = useState<any>(null)
  // Track if a valid Supabase session exists (e.g., established by the recovery link)
  const [hasSession, setHasSession] = useState(false)

  const queryAccessToken = searchParams?.get('access_token')
  const queryRefreshToken = searchParams?.get('refresh_token')
  const queryType = searchParams?.get('type')
  const queryCode = searchParams?.get('code')
  const [accessToken, setAccessToken] = useState<string | null>(queryAccessToken)
  const [refreshToken, setRefreshToken] = useState<string | null>(queryRefreshToken)
  const [linkType, setLinkType] = useState<string | null>(queryType)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    if (typeof window === 'undefined') return

    const initializePasswordReset = async () => {
      try {
        // Check if we have query parameters indicating a password reset
        if (queryCode || queryAccessToken) {
          console.log('🔍 Password reset link detected, processing...')
          
          if (queryCode) {
            // Handle the newer auth code flow
            const { error } = await supabase.auth.exchangeCodeForSession(queryCode)
            if (error) {
              console.error('🔍 Error exchanging code:', error)
              setError('Invalid or expired reset link. Please request a new one.')
            } else {
              console.log('🔍 Successfully exchanged code for session')
              setHasSession(true)
            }
          } else if (queryAccessToken && queryRefreshToken) {
            // Handle the older direct token flow (fallback)
            const { error } = await supabase.auth.setSession({
              access_token: queryAccessToken,
              refresh_token: queryRefreshToken
            })
            if (error) {
              console.error('🔍 Error setting session:', error)
              setError('Invalid or expired reset link. Please request a new one.')
            } else {
              console.log('🔍 Successfully set session from tokens')
              setHasSession(true)
            }
          }
        } else {
          // Check if we already have a valid session
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            console.log('🔍 Existing session found')
            setHasSession(true)
          } else {
            setError('No valid reset session found. Please request a new password reset link.')
          }
        }
      } catch (err) {
        console.error('🔍 Initialization error:', err)
        setError('An error occurred while processing the reset link.')
      } finally {
        setParsing(false)
      }

      // Set debug info
      setDebugInfo({
        hasQueryCode: !!queryCode,
        hasAccessToken: !!queryAccessToken,
        hasRefreshToken: !!queryRefreshToken,
        linkType,
        hasCode: !!queryCode
      })
    }

    initializePasswordReset()
  }, [queryCode, queryAccessToken, queryRefreshToken, linkType])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

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

    setLoading(true)

    try {
      console.log('🔍 Attempting password update...')
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        console.error('🔍 Password update error:', error)
        setError(error.message)
      } else {
        console.log('🔍 Password updated successfully')
        setSuccess('Password updated successfully! Redirecting to login...')
        try { await fetch('/api/auth/recovery/clear', { method: 'POST' }) } catch {}
        try { await supabase.auth.signOut() } catch {}
        setTimeout(() => {
          router.push('/login')
        }, 1500)
      }
    } catch (err) {
      console.error('🔍 Password update exception:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleRequestNewLink = async () => {
    const email = prompt('Please enter your email address to receive a new reset link:')
    if (!email) return

    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')
      const cleanUrl = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${cleanUrl}/reset-password`,
      })

      if (error) {
        setError(error.message)
      } else {
        setSuccess('New reset link sent! Check your email.')
      }
    } catch (err) {
      setError('Failed to send new reset link')
    }
  }

  if (parsing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Processing reset link...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Reset Password</CardTitle>
          <CardDescription>
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasSession ? (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error || 'Invalid or expired reset link. Please request a new one.'}
                </AlertDescription>
              </Alert>
              
              <Button 
                onClick={handleRequestNewLink}
                className="w-full"
                variant="outline"
              >
                Request New Reset Link
              </Button>
              
              {process.env.NODE_ENV === 'development' && debugInfo && (
                <div className="mt-4 p-2 bg-gray-100 rounded text-xs">
                  <strong>Debug Info:</strong>
                  <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your new password"
                    required
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert>
                  <AlertDescription className="text-green-600">{success}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Updating Password...' : 'Update Password'}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-muted-foreground hover:underline">
              Back to Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background p-4">Loading...</div>}>
      <ResetPasswordInner />
    </Suspense>
  )
} 