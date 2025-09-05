'use client'

import { useEffect, useState } from 'react'
import { Check, Cloud, CloudOff, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AutosaveStatusProps {
  lastSaved: Date | null
  isSaving: boolean
  hasError: boolean
  className?: string
}

export function AutosaveStatus({ lastSaved, isSaving, hasError, className }: AutosaveStatusProps) {
  const [showStatus, setShowStatus] = useState(false)

  useEffect(() => {
    if (isSaving || hasError) {
      setShowStatus(true)
    } else if (lastSaved) {
      setShowStatus(true)
      const timer = setTimeout(() => setShowStatus(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [isSaving, hasError, lastSaved])

  const getStatusText = () => {
    if (hasError) return 'Failed to save'
    if (isSaving) return 'Saving...'
    if (lastSaved) {
      const now = new Date()
      const diff = now.getTime() - lastSaved.getTime()
      if (diff < 5000) return 'Saved'
      if (diff < 60000) return 'Saved just now'
      const minutes = Math.floor(diff / 60000)
      return `Saved ${minutes} minute${minutes > 1 ? 's' : ''} ago`
    }
    return ''
  }

  const getIcon = () => {
    if (hasError) return <CloudOff className="h-3 w-3" />
    if (isSaving) return <Loader2 className="h-3 w-3 animate-spin" />
    return <Check className="h-3 w-3" />
  }

  if (!showStatus && !isSaving && !hasError) return null

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 text-xs rounded-md transition-all",
        hasError ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground",
        showStatus ? "opacity-100" : "opacity-0",
        className
      )}
    >
      {getIcon()}
      <span>{getStatusText()}</span>
    </div>
  )
} 