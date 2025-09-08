import { useState, useEffect } from "react"

export function useImpersonation() {
  const [isImpersonating, setIsImpersonating] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkImpersonation()
  }, [])

  const checkImpersonation = async () => {
    try {
      const response = await fetch('/api/auth/impersonation')
      const data = await response.json()
      setIsImpersonating(!!data.impersonatedUserId)
    } catch (error) {
      console.error('Failed to check impersonation:', error)
    } finally {
      setLoading(false)
    }
  }

  return { isImpersonating, loading }
} 