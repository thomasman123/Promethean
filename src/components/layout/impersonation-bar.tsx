"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { UserX } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"
import { Database } from "@/lib/database.types"
import { useRouter } from "next/navigation"

interface ImpersonatedUser {
  id: string
  email: string
  full_name: string | null
}

export function ImpersonationBar() {
  const [impersonatedUser, setImpersonatedUser] = useState<ImpersonatedUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    checkImpersonation()
  }, [])

  const checkImpersonation = async () => {
    try {
      // Check if we're impersonating
      const response = await fetch('/api/auth/impersonation')
      const data = await response.json()
      
      if (data.impersonatedUserId) {
        // Fetch impersonated user details
        const { data: user } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .eq('id', data.impersonatedUserId)
          .single()
        
        if (user) {
          setImpersonatedUser(user)
        }
      }
    } catch (error) {
      console.error('Error checking impersonation:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStopImpersonation = async () => {
    try {
      const response = await fetch('/api/admin/impersonate', {
        method: 'DELETE'
      })

      if (response.ok) {
        // Refresh the page to apply changes
        window.location.reload()
      }
    } catch (error) {
      console.error('Error stopping impersonation:', error)
    }
  }

  if (loading || !impersonatedUser) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-red-100 border-b border-red-200 px-4 py-2">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <UserX className="h-4 w-4 text-red-600" />
          <span className="text-sm text-red-800">
            Impersonating <strong>{impersonatedUser.full_name || impersonatedUser.email}</strong>
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="bg-white hover:bg-gray-100 text-red-600 border-red-300"
          onClick={handleStopImpersonation}
        >
          Stop Impersonation
        </Button>
      </div>
    </div>
  )
} 