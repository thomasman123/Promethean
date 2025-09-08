import { useState, useEffect } from "react"

interface EffectiveUser {
  id: string
  email: string
  full_name: string | null
  role: string | null
}

export function useEffectiveUser() {
  const [user, setUser] = useState<EffectiveUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [isImpersonating, setIsImpersonating] = useState(false)

  useEffect(() => {
    fetchEffectiveUser()
  }, [])

  const fetchEffectiveUser = async () => {
    try {
      const response = await fetch('/api/auth/effective-user')
      const data = await response.json()
      
      if (data.user) {
        setUser(data.user)
        setIsImpersonating(data.isImpersonating || false)
      }
    } catch (error) {
      console.error('Failed to get effective user:', error)
    } finally {
      setLoading(false)
    }
  }

  return { user, loading, isImpersonating }
} 