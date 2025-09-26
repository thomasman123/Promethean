"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Sword } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createBrowserClient } from "@supabase/ssr"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  
  const router = useRouter()
  
  // Create Supabase client using the newer SSR approach
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Handle Supabase recovery deep links that land on /login with hash tokens
  useEffect(() => {
    const hash = window.location.hash
    if (hash) {
      const params = new URLSearchParams(hash.substring(1))
      const type = params.get('type')
      if (type === 'recovery') {
        // Forward entire hash to reset-password so it can complete the flow
        window.location.replace(`/reset-password${hash}`)
        return
      }
    }
    
    // Only clear localStorage items that are actually corrupted
    const authKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('sb-') || key.includes('supabase')
    )
    authKeys.forEach(key => {
      try {
        const value = localStorage.getItem(key)
        // Only remove if value is actually corrupted (starts with "base64-")
        if (value && typeof value === 'string' && value.startsWith('base64-')) {
          console.log('Clearing corrupted localStorage item:', key)
          localStorage.removeItem(key)
        }
      } catch (e) {
        console.error('Error cleaning localStorage:', e)
      }
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      // Use server-side login endpoint for proper cookie handling
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include', // Important for cookies
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Login failed')
        setLoading(false)
      } else {
        setSuccess(true)
        // Use window.location for full page refresh with new auth state
        window.location.href = "/dashboard"
      }
    } catch (err) {
      setError("An unexpected error occurred")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6">
        <Link href="/" className="flex items-center gap-2">
          <Sword className="h-6 w-6 text-primary" />
          <span className="text-xl font-semibold">Promethean</span>
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-muted-foreground">
              Enter your email to sign in to your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <Input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 rounded-full px-5"
                disabled={loading}
              />
              
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 rounded-full px-5"
                disabled={loading}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">
                {error}
              </p>
            )}

            {success && (
              <p className="text-sm text-green-600 dark:text-green-400 text-center">
                Login successful! Redirecting...
              </p>
            )}

            <Button
              type="submit"
              disabled={loading || success}
              className="w-full h-12 rounded-full"
            >
              {success ? "Redirecting..." : loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="text-center mb-4">
            <Link href="/forgot-password" className="text-sm text-muted-foreground hover:underline">
              Forgot your password?
            </Link>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Don't have an account?
              </span>
            </div>
          </div>

          <Link href="/signup">
            <Button
              variant="outline"
              className="w-full h-12 rounded-full"
            >
              Sign up
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
} 