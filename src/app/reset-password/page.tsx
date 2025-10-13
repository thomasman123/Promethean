"use client"

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertCircle, Eye, EyeOff, Sword, Shield } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createBrowserClient } from '@supabase/ssr'
import { AnimatedGridPattern } from '@/components/ui/animated-grid-pattern'
import { cn } from '@/lib/utils'
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

  // Check both query params and hash fragments for recovery tokens
  const queryAccessToken = searchParams?.get('access_token')
  const queryRefreshToken = searchParams?.get('refresh_token')
  const queryType = searchParams?.get('type')
  const queryCode = searchParams?.get('code')
  
  // Also check URL hash for tokens (Supabase often sends them this way)
  const [hashAccessToken, setHashAccessToken] = useState<string | null>(null)
  const [hashRefreshToken, setHashRefreshToken] = useState<string | null>(null)
  const [hashType, setHashType] = useState<string | null>(null)
  
  const [accessToken, setAccessToken] = useState<string | null>(queryAccessToken)
  const [refreshToken, setRefreshToken] = useState<string | null>(queryRefreshToken)
  const [linkType, setLinkType] = useState<string | null>(queryType)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Use a flag to ensure this only runs once
    let hasRun = false
    
    const initializePasswordReset = async () => {
      if (hasRun) return
      hasRun = true

      try {
        // Extract tokens from URL hash if present (Supabase recovery links often use hash)
        const hash = window.location.hash
        let hashAccessTokenValue = null
        let hashRefreshTokenValue = null
        let hashTypeValue = null
        let hashErrorValue = null
        let hashErrorDescription = null
        
        if (hash) {
          const hashParams = new URLSearchParams(hash.substring(1))
          hashAccessTokenValue = hashParams.get('access_token')
          hashRefreshTokenValue = hashParams.get('refresh_token')
          hashTypeValue = hashParams.get('type')
          hashErrorValue = hashParams.get('error')
          hashErrorDescription = hashParams.get('error_description')
          
          if (hashAccessTokenValue) setHashAccessToken(hashAccessTokenValue)
          if (hashRefreshTokenValue) setHashRefreshToken(hashRefreshTokenValue)
          if (hashTypeValue) setHashType(hashTypeValue)
        }

        // Check for errors in hash or query params
        const errorCode = hashErrorValue || searchParams?.get('error')
        const errorDescription = hashErrorDescription || searchParams?.get('error_description')
        
        if (errorCode) {
          console.error('🔍 Auth error in URL:', errorCode, errorDescription)
          setError(errorDescription || 'Authentication error occurred')
          setParsing(false)
          return
        }

        // Determine final tokens (prefer query params, fallback to hash)
        const finalAccessToken = queryAccessToken || hashAccessTokenValue
        const finalRefreshToken = queryRefreshToken || hashRefreshTokenValue
        const finalCode = queryCode

        // Update main state with final values
        if (finalAccessToken && !queryAccessToken) setAccessToken(finalAccessToken)
        if (finalRefreshToken && !queryRefreshToken) setRefreshToken(finalRefreshToken)
        if ((hashTypeValue || queryType) && !linkType) setLinkType(hashTypeValue || queryType)

        // First, check if we already have a valid session (from the redirect)
        const { data: { session: existingSession } } = await supabase.auth.getSession()
        if (existingSession) {
          console.log('🔍 Existing valid session found')
          setHasSession(true)
          setError('')
          setParsing(false)
          return
        }

        // Try to establish session from URL parameters
        if (finalCode || finalAccessToken) {
          console.log('🔍 Password reset link detected, processing...')
          setError('')
          
          if (finalCode) {
            // Handle the auth code flow (PKCE)
            console.log('🔍 Attempting to exchange code for session...')
            const { data, error } = await supabase.auth.exchangeCodeForSession(finalCode)
            if (error) {
              console.error('🔍 Error exchanging code:', error)
              setError('Invalid or expired reset link. Please request a new one.')
              setParsing(false)
              return
            } else {
              console.log('🔍 Successfully exchanged code for session', data)
              setHasSession(true)
              setError('')
            }
          } else if (finalAccessToken && finalRefreshToken) {
            // Handle the direct token flow (legacy)
            console.log('🔍 Attempting to set session from tokens...')
            const { data, error } = await supabase.auth.setSession({
              access_token: finalAccessToken,
              refresh_token: finalRefreshToken
            })
            if (error) {
              console.error('🔍 Error setting session:', error)
              setError('Invalid or expired reset link. Please request a new one.')
              setParsing(false)
              return
            } else {
              console.log('🔍 Successfully set session from tokens', data)
              setHasSession(true)
              setError('')
            }
          }
        } else {
          console.log('🔍 No auth code or tokens found in URL')
          setError('No valid reset session found. Please request a new password reset link.')
        }

        // Set debug info
        setDebugInfo({
          hasQueryCode: !!finalCode,
          hasAccessToken: !!finalAccessToken,
          hasRefreshToken: !!finalRefreshToken,
          hasHashAccessToken: !!hashAccessTokenValue,
          hasHashRefreshToken: !!hashRefreshTokenValue,
          linkType: queryType,
          hashType: hashTypeValue,
          hasCode: !!finalCode,
          currentUrl: window.location.href,
          hash: window.location.hash,
          errorCode,
          errorDescription
        })
      } catch (err) {
        console.error('🔍 Initialization error:', err)
        setError('An error occurred while processing the reset link.')
      } finally {
        setParsing(false)
      }
    }

    initializePasswordReset()
    // Only depend on the query params, not the state we're setting
  }, [queryCode, queryAccessToken, queryRefreshToken, queryType])

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
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Processing reset link...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Side - Brand Section */}
      <div className="relative w-full md:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground p-8 md:p-12 flex flex-col justify-between min-h-[40vh] md:min-h-screen">
        {/* Animated Background Pattern */}
        <AnimatedGridPattern
          numSquares={30}
          maxOpacity={0.15}
          duration={3}
          repeatDelay={1}
          className={cn(
            "[mask-image:radial-gradient(500px_circle_at_center,white,transparent)]",
            "absolute inset-0 h-full w-full"
          )}
        />

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Sword className="h-8 w-8" />
            <span className="text-2xl font-bold">Promethean</span>
          </Link>
        </div>

        <div className="relative z-10 space-y-4">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
            Secure Your Account
          </h1>
          <p className="text-lg md:text-xl opacity-90 max-w-md">
            Create a strong password to protect your sales data and insights.
          </p>
        </div>

        <div className="relative z-10 text-sm opacity-75">
          &copy; {new Date().getFullYear()} Promethean. All rights reserved.
        </div>
      </div>

      {/* Right Side - Form Section */}
      <div className="w-full md:w-1/2 bg-background flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md space-y-8">
          {!hasSession ? (
            // Error State
            <>
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                  </div>
                </div>
                <div className="space-y-2 text-center">
                  <h2 className="text-3xl font-bold tracking-tight">Invalid Reset Link</h2>
                  <p className="text-muted-foreground">
                    {error || 'This password reset link is invalid or has expired'}
                  </p>
                </div>
              </div>

              <Button 
                onClick={handleRequestNewLink}
                className="w-full h-12 rounded-full"
                variant="outline"
              >
                Request New Reset Link
              </Button>

              {process.env.NODE_ENV === 'development' && debugInfo && (
                <div className="mt-4 p-2 bg-muted rounded text-xs">
                  <strong>Debug Info:</strong>
                  <pre className="mt-2 overflow-auto">{JSON.stringify(debugInfo, null, 2)}</pre>
                </div>
              )}

              <Link href="/login" className="block text-center">
                <Button variant="ghost" className="w-full h-12 rounded-full">
                  Back to Login
                </Button>
              </Link>
            </>
          ) : (
            // Form State
            <>
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                    <Shield className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <div className="space-y-2 text-center">
                  <h2 className="text-3xl font-bold tracking-tight">Reset Password</h2>
                  <p className="text-muted-foreground">
                    Enter your new password below
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="New password"
                      required
                      autoFocus
                      className="h-12 rounded-full px-5 pr-12"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full hover:bg-muted"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      required
                      className="h-12 rounded-full px-5 pr-12"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full hover:bg-muted"
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
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive text-center flex items-center justify-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      {error}
                    </p>
                  </div>
                )}

                {success && (
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-sm text-green-600 dark:text-green-400 text-center">
                      {success}
                    </p>
                  </div>
                )}

                <Button type="submit" className="w-full h-12 rounded-full" disabled={loading}>
                  {loading ? 'Updating Password...' : 'Update Password'}
                </Button>
              </form>

              <Link href="/login" className="block text-center">
                <Button variant="ghost" className="w-full h-12 rounded-full">
                  Back to Login
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
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