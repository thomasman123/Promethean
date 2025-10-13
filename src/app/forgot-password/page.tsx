"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createBrowserClient } from "@supabase/ssr"
import { Sword, ArrowLeft, Mail, CheckCircle } from "lucide-react"
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern"
import { cn } from "@/lib/utils"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [error, setError] = useState("")

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')
      const cleanUrl = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${cleanUrl}/reset-password`,
      })

      if (error) {
        setError(error.message)
        return
      }

      setEmailSent(true)
    } catch (error) {
      setError("An unexpected error occurred")
      console.error("Forgot password error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleResendEmail = async () => {
    await handleForgotPassword({ preventDefault: () => {} } as React.FormEvent)
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
            We've Got You Covered
          </h1>
          <p className="text-lg md:text-xl opacity-90 max-w-md">
            Reset your password and get back to tracking your success in no time.
          </p>
        </div>

        <div className="relative z-10 text-sm opacity-75">
          &copy; {new Date().getFullYear()} Promethean. All rights reserved.
        </div>
      </div>

      {/* Right Side - Form Section */}
      <div className="w-full md:w-1/2 bg-background flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md space-y-8">
          {emailSent ? (
            // Success State
            <>
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold tracking-tight">Check your email</h2>
                  <p className="text-muted-foreground">
                    We've sent a password reset link to <strong>{email}</strong>
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Didn't receive the email? Check your spam folder or try again.
                </p>
                <Button
                  variant="outline"
                  onClick={handleResendEmail}
                  disabled={loading}
                  className="w-full h-12 rounded-full"
                >
                  {loading ? "Sending..." : "Resend email"}
                </Button>
              </div>

              <Link href="/login" className="block">
                <Button variant="ghost" className="w-full h-12 rounded-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to login
                </Button>
              </Link>
            </>
          ) : (
            // Form State
            <>
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                    <Mail className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <div className="space-y-2 text-center">
                  <h2 className="text-3xl font-bold tracking-tight">Forgot your password?</h2>
                  <p className="text-muted-foreground">
                    Enter your email address and we'll send you a link to reset your password
                  </p>
                </div>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-6">
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="h-12 rounded-full px-5"
                  disabled={loading}
                />

                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive text-center">
                      {error}
                    </p>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-12 rounded-full" 
                  disabled={loading || !email}
                >
                  {loading ? "Sending..." : "Send reset email"}
                </Button>
              </form>

              <Link href="/login" className="block">
                <Button variant="ghost" className="w-full h-12 rounded-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to login
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
} 