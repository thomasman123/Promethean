"use client"

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabase } from '@/lib/supabase'
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
  const [accessToken, setAccessToken] = useState<string | null>(queryAccessToken)
  const [refreshToken, setRefreshToken] = useState<string | null>(queryRefreshToken)
  const [linkType, setLinkType] = useState<string | null>(queryType)

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // Listen for auth state changes; if a session appears (e.g., PASSWORD_RECOVERY), allow form
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) setHasSession(true)
      // Some providers emit PASSWORD_RECOVERY; treat that as recovery context
      if (event === 'PASSWORD_RECOVERY') setLinkType('recovery')
    })

    // Also check current session immediately
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session))

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // Debug: Log everything we can see
    const currentUrl = window.location.href
    const hash = window.location.hash
    const search = window.location.search
    
    console.log('🔍 Reset Password Debug:', {
      currentUrl,
      hash,
      search,
      queryAccessToken,
      queryRefreshToken,
      queryType
    })
    
    // If tokens are not in query, attempt to parse from hash
    if (!accessToken) {
      console.log('🔍 No access token in query, checking hash:', hash)
      
      if (hash && hash.includes('access_token')) {
        console.log('🔍 Found tokens in hash, parsing...')
        const params = new URLSearchParams(hash.replace(/^#/, ''))
        const hashAccessToken = params.get('access_token')
        const hashRefreshToken = params.get('refresh_token')
        const hashType = params.get('type')
        
        console.log('🔍 Hash tokens:', {
          accessToken: hashAccessToken ? 'found' : 'missing',
          refreshToken: hashRefreshToken ? 'found' : 'missing',
          type: hashType
        })
        
        setAccessToken(hashAccessToken)
        setRefreshToken(hashRefreshToken)
        setLinkType(hashType)
        
        // Normalize URL to query params for consistency
        const qs = params.toString()
        console.log('🔍 Redirecting to query params:', qs)
        router.replace(`/reset-password?${qs}`)
      }
    }
    
    setDebugInfo({
      currentUrl,
      hash,
      search,
      hasQueryTokens: !!(queryAccessToken && queryRefreshToken),
      hasHashTokens: !!(hash && hash.includes('access_token')),
      linkType: linkType || queryType
    })
    
    setParsing(false)
  }, [accessToken, router, queryAccessToken, queryRefreshToken, queryType, linkType])

  useEffect(() => {
    // Only set a session if this is an actual recovery flow
    if (accessToken && refreshToken && linkType === 'recovery') {
      console.log('🔍 Setting Supabase session with tokens')
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      }).then(({ data, error }) => {
        console.log('🔍 Session set result:', { 
          hasSession: !!data.session, 
          error: error?.message 
        })
        if (data.session) setHasSession(true)
      })
    } else {
      console.log('🔍 Not setting session:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        linkType
      })
    }
  }, [accessToken, refreshToken, linkType])

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
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      }
    } catch (err) {
      console.error('🔍 Password update exception:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleRequestNewLink = async () => {
    try {
      const { data } = await supabase.auth.getUser()
      const userEmail = data.user?.email
      
      if (userEmail) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')
        const cleanUrl = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl
        const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
          redirectTo: `${cleanUrl}/reset-password`,
        })
        
        if (error) {
          setError(error.message)
        } else {
          setSuccess('New password reset link sent to your email!')
        }
      } else {
        setError('Unable to determine email address for new link')
      }
    } catch (err) {
      setError('Failed to request new reset link')
    }
  }

  // Show loading while parsing URL
  if (parsing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Check if we have valid context for password reset
  const hasValidContext = (accessToken && refreshToken && linkType === 'recovery') || hasSession

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Reset Password</CardTitle>
          <CardDescription className="text-center">
            {hasValidContext 
              ? 'Enter your new password below'
              : 'This password reset link is invalid or has expired'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Debug Information */}
          {process.env.NODE_ENV === 'development' && debugInfo && (
            <div className="mb-4 p-3 bg-muted rounded-md text-xs">
              <div className="font-semibold mb-2">Debug Info:</div>
              <div>Has Query Tokens: {debugInfo.hasQueryTokens ? 'Yes' : 'No'}</div>
              <div>Has Hash Tokens: {debugInfo.hasHashTokens ? 'Yes' : 'No'}</div>
              <div>Link Type: {debugInfo.linkType || 'None'}</div>
              <div>Access Token: {accessToken ? 'Present' : 'Missing'}</div>
              <div>Refresh Token: {refreshToken ? 'Present' : 'Missing'}</div>
              <div>Session: {hasSession ? 'Yes' : 'No'}</div>
              <div>Valid for Reset: {hasValidContext ? 'Yes' : 'No'}</div>
            </div>
          )}

          {!hasValidContext ? (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Invalid Reset Link
                  <br />
                  This password reset link is invalid or has expired.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Button 
                  onClick={handleRequestNewLink} 
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? 'Sending...' : 'Request New Reset Link'}
                </Button>
                
                <div className="text-center">
                  <Link href="/forgot-password" className="text-sm text-muted-foreground hover:underline">
                    Or go to forgot password page
                  </Link>
                </div>
              </div>
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