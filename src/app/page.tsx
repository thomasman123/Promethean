"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { Loading } from "@/components/ui/loading"

export default function HomePage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        window.location.href = "/dashboard"
      } else {
        window.location.href = "/login"
      }
      setChecking(false)
    }

    checkAuth()
  }, [router, supabase])

  if (checking) {
    return (
      <div className="min-h-screen bg-background">
        <Loading text="Loading..." />
      </div>
    )
  }

  return null
} 