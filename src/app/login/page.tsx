"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Sword, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern"
import { cn } from "@/lib/utils"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  
  const router = useRouter()

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
            Turn Your Sales Data Into Revenue
          </h1>
          <p className="text-lg md:text-xl opacity-90 max-w-md">
            Track performance, optimize conversions, and maximize ROI with real-time insights.
          </p>
        </div>

        <div className="relative z-10 text-sm opacity-75">
          &copy; {new Date().getFullYear()} Promethean. All rights reserved.
        </div>
      </div>

      {/* Right Side - Form Section */}
      <div className="w-full md:w-1/2 bg-background flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-muted-foreground">
              Enter your credentials to access your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
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

            <div className="flex items-center justify-end">
              <Link 
                href="/forgot-password" 
                className="text-sm text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive text-center">
                  {error}
                </p>
              </div>
            )}

            {success && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-sm text-green-600 dark:text-green-400 text-center">
                  Login successful! Redirecting...
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || success}
              className="w-full h-12 rounded-full"
            >
              {success ? "Redirecting..." : loading ? "Signing in..." : "Sign in"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

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

          <Link href="/signup" className="block">
            <Button
              variant="outline"
              className="w-full h-12 rounded-full"
            >
              Create an account
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
} 