"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Sword, Eye, EyeOff, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export default function AuthPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
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
      if (!isSignUp) {
        // Try to sign in
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            // User doesn't exist, switch to sign up mode
            setIsSignUp(true)
            setError("")
          } else {
            setError(error.message)
          }
        } else {
          // Success - redirect to dashboard
          setSuccess(true)
          setTimeout(() => {
            router.push("/dashboard")
          }, 1000)
        }
      } else {
        // Sign up mode
        if (password !== confirmPassword) {
          setError("Passwords do not match")
          setLoading(false)
          return
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })

        if (error) {
          setError(error.message)
        } else {
          setSuccess(true)
          setError("")
          // Show success message
          setTimeout(() => {
            router.push("/dashboard")
          }, 1000)
        }
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    // Reset to login mode when email changes
    if (isSignUp) {
      setIsSignUp(false)
      setConfirmPassword("")
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center space-y-6">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
            <Sword className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold">Welcome to Promethean</h1>
            <p className="text-muted-foreground mt-2">
              {isSignUp ? "Create your account" : "Log in or sign up"}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="alex@example.com"
              required
              className="h-12 rounded-full px-5 bg-muted/50 border-border/50 focus:bg-background"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="h-12 rounded-full px-5 pr-12 bg-muted/50 border-border/50 focus:bg-background"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {isSignUp && (
            <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="h-12 rounded-full px-5 pr-12 bg-muted/50 border-border/50 focus:bg-background"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive text-center animate-in fade-in-0 duration-200">
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center justify-center gap-2 p-3 rounded-full bg-green-500/10 border border-green-500/20 animate-in fade-in-0 zoom-in-95 duration-200">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-green-500">
                <Check className="h-3 w-3 text-white" />
              </div>
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                Success!
              </span>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || success}
            className="w-full h-12 rounded-full text-base font-medium"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                {isSignUp ? "Creating account..." : "Signing in..."}
              </span>
            ) : (
              <span>{isSignUp ? "Sign up" : "Sign in"}</span>
            )}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          By {isSignUp ? "signing up" : "signing in"}, you agree to our
          <br />
          <a href="#" className="underline hover:text-foreground transition-colors">
            Terms of Service
          </a>
          {" & "}
          <a href="#" className="underline hover:text-foreground transition-colors">
            Privacy Policy
          </a>
        </div>
      </div>
    </div>
  )
} 