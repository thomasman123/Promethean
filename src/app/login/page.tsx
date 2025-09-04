"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Sword } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        setLoading(false)
      } else {
        setSuccess(true)
        // Use window.location for a hard redirect to ensure proper navigation
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