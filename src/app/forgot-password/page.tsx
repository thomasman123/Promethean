"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { ArrowLeft, Command, Mail, CheckCircle } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const router = useRouter()

  // Check if user is already logged in and redirect
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.replace('/dashboard')
      }
    }
    
    checkAuth()
  }, [router])

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        toast.error(error.message)
        return
      }

      setEmailSent(true)
      toast.success("Password reset email sent!")
    } catch (error) {
      toast.error("An unexpected error occurred")
      console.error("Forgot password error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleResendEmail = async () => {
    if (!email) {
      toast.error("Please enter your email address")
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success("Password reset email sent again!")
    } catch (error) {
      toast.error("An unexpected error occurred")
      console.error("Resend email error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="bg-primary text-primary-foreground flex aspect-square size-12 items-center justify-center rounded-lg">
              <Command className="size-6" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {emailSent ? "Check your email" : "Forgot your password?"}
          </h1>
          <p className="text-muted-foreground">
            {emailSent
                             ? "We&apos;ve sent a password reset link to your email address"
              : "No worries, we'll send you reset instructions"
            }
          </p>
        </div>

        {/* Forgot Password Form */}
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2">
              {emailSent ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Email sent
                </>
              ) : (
                <>
                  <Mail className="h-5 w-5" />
                  Reset password
                </>
              )}
            </CardTitle>
            <CardDescription>
              {emailSent
                ? "Check your inbox and follow the instructions to reset your password"
                : "Enter your email address and we'll send you a link to reset your password"
              }
            </CardDescription>
          </CardHeader>

          {emailSent ? (
            <CardContent className="space-y-4">
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                                     We&apos;ve sent a password reset link to <strong>{email}</strong>. 
                  Click the link in the email to reset your password.
                </AlertDescription>
              </Alert>
              
              <div className="text-sm text-muted-foreground space-y-2">
                                 <p>• Check your spam/junk folder if you don&apos;t see the email</p>
                 <p>• The link will expire in 1 hour for security</p>
                 <p>• You can request a new link if needed</p>
              </div>
            </CardContent>
          ) : (
            <form onSubmit={handleForgotPassword}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    autoFocus
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Sending..." : "Send reset link"}
                </Button>
              </CardFooter>
            </form>
          )}

          {emailSent && (
            <CardFooter className="flex flex-col space-y-4 pt-0">
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleResendEmail}
                disabled={loading}
              >
                {loading ? "Sending..." : "Resend email"}
              </Button>
            </CardFooter>
          )}
        </Card>

        {/* Back to Login */}
        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        </div>

        {/* Additional Help */}
        {emailSent && (
          <Card className="border-muted">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <h3 className="font-medium">Still need help?</h3>
                <p className="text-sm text-muted-foreground">
                  If you continue to have trouble, you can{" "}
                  <Link href="/support" className="text-primary hover:underline">
                    contact support
                  </Link>
                  {" "}for assistance.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
} 