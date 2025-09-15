import { useState, useEffect, useCallback } from 'react'
import { 
  getAccountTimezone, 
  clearTimezoneCache, 
  formatInAccountTimezone,
  getDateLabelInTimezone,
  formatDateTimeInTimezone,
  useTimezoneFormatting,
  isPastInTimezone,
  isTodayInTimezone,
  isTomorrowInTimezone,
  getCurrentTimeFormatted,
  DATE_FORMATS
} from '@/lib/timezone-utils'

interface UseAccountTimezoneReturn {
  timezone: string
  loading: boolean
  error: string | null
  
  // Formatting functions bound to the account timezone
  formatDate: (utcTimestamp: string | Date, formatString?: string) => string
  formatDateTime: (utcTimestamp: string | Date) => { date: string; time: string; full: string }
  getDateLabel: (utcTimestamp: string | Date) => string
  getFormatting: (utcTimestamp: string | Date) => ReturnType<typeof useTimezoneFormatting>
  
  // Timezone-aware date checks
  isPast: (utcTimestamp: string | Date) => boolean
  isToday: (utcTimestamp: string | Date) => boolean
  isTomorrow: (utcTimestamp: string | Date) => boolean
  
  // Current time in account timezone
  getCurrentTime: (formatString?: string) => string
  
  // Refresh timezone (useful when account changes)
  refresh: () => Promise<void>
}

export function useAccountTimezone(accountId: string | null | undefined): UseAccountTimezoneReturn {
  const [timezone, setTimezone] = useState<string>('UTC')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTimezone = useCallback(async (accountId: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const tz = await getAccountTimezone(accountId)
      setTimezone(tz)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch timezone'
      setError(errorMessage)
      console.error('Error fetching account timezone:', err)
      setTimezone('UTC') // Fallback to UTC
    } finally {
      setLoading(false)
    }
  }, [])

  // Load timezone when accountId changes
  useEffect(() => {
    if (accountId) {
      fetchTimezone(accountId)
    } else {
      setTimezone('UTC')
      setLoading(false)
      setError(null)
    }
  }, [accountId, fetchTimezone])

  // Refresh function
  const refresh = useCallback(async () => {
    if (accountId) {
      clearTimezoneCache(accountId)
      await fetchTimezone(accountId)
    }
  }, [accountId, fetchTimezone])

  // Bound formatting functions
  const formatDate = useCallback((
    utcTimestamp: string | Date, 
    formatString: string = DATE_FORMATS.LONG_DATETIME
  ) => {
    return formatInAccountTimezone(utcTimestamp, timezone, formatString)
  }, [timezone])

  const formatDateTime = useCallback((utcTimestamp: string | Date) => {
    return formatDateTimeInTimezone(utcTimestamp, timezone)
  }, [timezone])

  const getDateLabel = useCallback((utcTimestamp: string | Date) => {
    return getDateLabelInTimezone(utcTimestamp, timezone)
  }, [timezone])

  const getFormatting = useCallback((utcTimestamp: string | Date) => {
    return useTimezoneFormatting(utcTimestamp, timezone)
  }, [timezone])

  const isPast = useCallback((utcTimestamp: string | Date) => {
    return isPastInTimezone(utcTimestamp, timezone)
  }, [timezone])

  const isToday = useCallback((utcTimestamp: string | Date) => {
    return isTodayInTimezone(utcTimestamp, timezone)
  }, [timezone])

  const isTomorrow = useCallback((utcTimestamp: string | Date) => {
    return isTomorrowInTimezone(utcTimestamp, timezone)
  }, [timezone])

  const getCurrentTime = useCallback((formatString?: string) => {
    return getCurrentTimeFormatted(timezone, formatString)
  }, [timezone])

  return {
    timezone,
    loading,
    error,
    formatDate,
    formatDateTime,
    getDateLabel,
    getFormatting,
    isPast,
    isToday,
    isTomorrow,
    getCurrentTime,
    refresh
  }
} 