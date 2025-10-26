import { format, formatDistanceToNow, isToday, isTomorrow, isPast, parseISO } from 'date-fns'
import { formatInTimeZone, zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz'

// Cache for account timezones to avoid repeated API calls
const timezoneCache = new Map<string, string>()

/**
 * Get the timezone for a specific account
 */
export async function getAccountTimezone(accountId: string): Promise<string> {
  // Check cache first
  if (timezoneCache.has(accountId)) {
    return timezoneCache.get(accountId)!
  }

  try {
    // Fetch from API
    const response = await fetch(`/api/accounts/${accountId}/timezone`)
    if (response.ok) {
      const data = await response.json()
      const timezone = data.timezone || 'UTC'
      timezoneCache.set(accountId, timezone)
      return timezone
    }
  } catch (error) {
    console.warn('Failed to fetch account timezone:', error)
  }

  // Default to UTC
  timezoneCache.set(accountId, 'UTC')
  return 'UTC'
}

/**
 * Clear timezone cache (useful when account changes)
 */
export function clearTimezoneCache(accountId?: string) {
  if (accountId) {
    timezoneCache.delete(accountId)
  } else {
    timezoneCache.clear()
  }
}

/**
 * Convert a UTC timestamp to account timezone
 */
export function convertToAccountTimezone(
  utcTimestamp: string | Date,
  accountTimezone: string
): Date {
  const date = typeof utcTimestamp === 'string' ? parseISO(utcTimestamp) : utcTimestamp
  return utcToZonedTime(date, accountTimezone)
}

/**
 * Convert account timezone date to UTC
 */
export function convertToUTC(
  localDate: Date,
  accountTimezone: string
): Date {
  return zonedTimeToUtc(localDate, accountTimezone)
}

/**
 * Format a UTC timestamp in account timezone
 */
export function formatInAccountTimezone(
  utcTimestamp: string | Date,
  accountTimezone: string,
  formatString: string = 'MMM d, yyyy h:mm a'
): string {
  const date = typeof utcTimestamp === 'string' ? parseISO(utcTimestamp) : utcTimestamp
  return formatInTimeZone(date, accountTimezone, formatString)
}

/**
 * Get a human-readable date label (Today, Tomorrow, etc.) in account timezone
 */
export function getDateLabelInTimezone(
  utcTimestamp: string | Date,
  accountTimezone: string
): string {
  const zonedDate = convertToAccountTimezone(utcTimestamp, accountTimezone)
  
  if (isToday(zonedDate)) return 'Today'
  if (isTomorrow(zonedDate)) return 'Tomorrow'
  if (isPast(zonedDate)) return formatDistanceToNow(zonedDate, { addSuffix: true })
  return format(zonedDate, 'MMM d, yyyy')
}

/**
 * Format date and time separately in account timezone
 */
export function formatDateTimeInTimezone(
  utcTimestamp: string | Date,
  accountTimezone: string
): { date: string; time: string; full: string } {
  const date = typeof utcTimestamp === 'string' ? parseISO(utcTimestamp) : utcTimestamp
  
  return {
    date: formatInTimeZone(date, accountTimezone, 'MMM d, yyyy'),
    time: formatInTimeZone(date, accountTimezone, 'h:mm a'),
    full: formatInTimeZone(date, accountTimezone, 'MMM d, yyyy h:mm a')
  }
}

/**
 * Check if a date is in the past relative to account timezone
 */
export function isPastInTimezone(
  utcTimestamp: string | Date,
  accountTimezone: string
): boolean {
  const zonedDate = convertToAccountTimezone(utcTimestamp, accountTimezone)
  return isPast(zonedDate)
}

/**
 * Check if a date is today in account timezone
 */
export function isTodayInTimezone(
  utcTimestamp: string | Date,
  accountTimezone: string
): boolean {
  const zonedDate = convertToAccountTimezone(utcTimestamp, accountTimezone)
  return isToday(zonedDate)
}

/**
 * Check if a date is tomorrow in account timezone
 */
export function isTomorrowInTimezone(
  utcTimestamp: string | Date,
  accountTimezone: string
): boolean {
  const zonedDate = convertToAccountTimezone(utcTimestamp, accountTimezone)
  return isTomorrow(zonedDate)
}

/**
 * Get current date/time in account timezone
 */
export function getCurrentTimeInTimezone(accountTimezone: string): Date {
  return utcToZonedTime(new Date(), accountTimezone)
}

/**
 * Format current time in account timezone
 */
export function getCurrentTimeFormatted(
  accountTimezone: string,
  formatString: string = 'MMM d, yyyy h:mm a'
): string {
  return formatInTimeZone(new Date(), accountTimezone, formatString)
}

/**
 * Calculate timezone-aware local dates for appointments/discoveries/dials
 * Returns local_date, local_week (Monday start), and local_month
 */
export function calculateLocalDatesForRecord(
  utcTimestamp: string | Date,
  accountTimezone: string
): { local_date: string; local_week: string; local_month: string } {
  const date = typeof utcTimestamp === 'string' ? parseISO(utcTimestamp) : utcTimestamp
  const zonedDate = utcToZonedTime(date, accountTimezone)
  
  // Local date in YYYY-MM-DD format
  const local_date = formatInTimeZone(zonedDate, accountTimezone, 'yyyy-MM-dd')
  
  // Start of week (Monday) in local timezone
  const dayOfWeek = zonedDate.getDay()
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // 0=Sunday, 1=Monday, etc.
  const weekStart = new Date(zonedDate)
  weekStart.setDate(weekStart.getDate() - daysToMonday)
  const local_week = formatInTimeZone(weekStart, accountTimezone, 'yyyy-MM-dd')
  
  // Start of month in local timezone
  const monthStart = new Date(zonedDate.getFullYear(), zonedDate.getMonth(), 1)
  const local_month = formatInTimeZone(monthStart, accountTimezone, 'yyyy-MM-dd')
  
  return { local_date, local_week, local_month }
}

// Common format strings
export const DATE_FORMATS = {
  SHORT_DATE: 'MMM d',
  LONG_DATE: 'MMM d, yyyy',
  SHORT_DATETIME: 'MMM d h:mm a',
  LONG_DATETIME: 'MMM d, yyyy h:mm a',
  TIME_ONLY: 'h:mm a',
  ISO_DATE: 'yyyy-MM-dd',
  ISO_DATETIME: 'yyyy-MM-dd HH:mm:ss'
} as const

/**
 * Timezone-aware date formatting hook-like function
 * Returns commonly used formatted versions
 */
export function useTimezoneFormatting(
  utcTimestamp: string | Date,
  accountTimezone: string
) {
  const date = typeof utcTimestamp === 'string' ? parseISO(utcTimestamp) : utcTimestamp
  
  return {
    shortDate: formatInTimeZone(date, accountTimezone, DATE_FORMATS.SHORT_DATE),
    longDate: formatInTimeZone(date, accountTimezone, DATE_FORMATS.LONG_DATE),
    shortDateTime: formatInTimeZone(date, accountTimezone, DATE_FORMATS.SHORT_DATETIME),
    longDateTime: formatInTimeZone(date, accountTimezone, DATE_FORMATS.LONG_DATETIME),
    timeOnly: formatInTimeZone(date, accountTimezone, DATE_FORMATS.TIME_ONLY),
    isoDate: formatInTimeZone(date, accountTimezone, DATE_FORMATS.ISO_DATE),
    relative: getDateLabelInTimezone(date, accountTimezone),
    isToday: isTodayInTimezone(date, accountTimezone),
    isTomorrow: isTomorrowInTimezone(date, accountTimezone),
    isPast: isPastInTimezone(date, accountTimezone)
  }
} 