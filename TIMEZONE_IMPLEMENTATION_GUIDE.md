# Account Timezone System Implementation Guide

## Overview

The timezone system is now implemented to display all dates and times in the **account's business timezone** instead of UTC or browser timezone. This ensures that users see data in their local business context.

## System Architecture

### Database Level ✅ (Already Implemented)
- `accounts.business_timezone` - IANA timezone identifier (e.g., 'America/New_York')
- `local_date`, `local_week`, `local_month` columns on all data tables
- Automatic triggers convert UTC timestamps to account timezone dates
- Metrics engine uses local columns for aggregations

### Frontend Level 🚀 (Now Available)
- `useAccountTimezone()` hook for React components
- Comprehensive timezone utilities in `timezone-utils.ts`
- API endpoint `/api/accounts/[accountId]/timezone`
- Caching system to avoid repeated API calls

## Quick Implementation

### 1. Basic Usage in Components

```tsx
import { useAccountTimezone } from '@/hooks/use-account-timezone'
import { useDashboard } from '@/lib/dashboard-context'

function MyComponent() {
  const { selectedAccountId } = useDashboard()
  const { formatDate, getDateLabel, isToday } = useAccountTimezone(selectedAccountId)
  
  return (
    <div>
      {/* Instead of: new Date(appointment.date_booked_for).toLocaleString() */}
      <p>Scheduled: {formatDate(appointment.date_booked_for)}</p>
      
      {/* Instead of: format(new Date(date), 'MMM d, yyyy') */}
      <p>Date: {formatDate(date, 'MMM d, yyyy')}</p>
      
      {/* Smart relative dates */}
      <p>{getDateLabel(appointment.date_booked_for)}</p> {/* "Today", "Tomorrow", etc. */}
      
      {/* Timezone-aware checks */}
      {isToday(appointment.date_booked_for) && <Badge>Today</Badge>}
    </div>
  )
}
```

### 2. Advanced Formatting

```tsx
function AdvancedComponent() {
  const { selectedAccountId } = useDashboard()
  const { getFormatting, formatDateTime } = useAccountTimezone(selectedAccountId)
  
  const appointment = { date_booked_for: '2025-09-15T23:20:10.310087+00:00' }
  const formatting = getFormatting(appointment.date_booked_for)
  const dateTime = formatDateTime(appointment.date_booked_for)
  
  return (
    <div>
      <p>Short: {formatting.shortDate}</p>        {/* "Sep 15" */}
      <p>Long: {formatting.longDate}</p>          {/* "Sep 15, 2025" */}
      <p>Time: {formatting.timeOnly}</p>          {/* "7:20 PM" */}
      <p>Full: {dateTime.full}</p>                {/* "Sep 15, 2025 7:20 PM" */}
      <p>Relative: {formatting.relative}</p>      {/* "Today", "2 days ago" */}
      
      {formatting.isToday && <Badge>Today</Badge>}
      {formatting.isPast && <Badge variant="secondary">Past</Badge>}
    </div>
  )
}
```

## Components That Need Updates

### High Priority (User-Facing Dates)

1. **Dashboard Widgets** (`src/components/dashboard/`)
   - All chart widgets showing date labels
   - Metric widgets with date ranges
   - Date picker components

2. **Data Views** (`src/app/data-view/`)
   - Table date columns
   - Filter date displays
   - Export timestamps

3. **Update Data Pages** (`src/app/update-data/`)
   - Appointment scheduling displays ✅ (Follow-ups partially done)
   - Discovery call times
   - Payment due dates

4. **Account Pages** (`src/app/account/`)
   - Team member activity timestamps
   - GHL connection status dates
   - Settings modification dates

### Medium Priority (Admin/Debug)

5. **Admin Pages**
   - User management timestamps
   - System logs and webhook logs
   - Account creation dates

6. **Playground** (`src/app/playground/`)
   - Autosave timestamps
   - Session tracking

## Implementation Pattern

### Replace These Patterns:

```tsx
// ❌ OLD: Browser timezone
new Date(timestamp).toLocaleString()
new Date(timestamp).toLocaleDateString()
format(new Date(timestamp), 'MMM d, yyyy')

// ❌ OLD: UTC/Browser timezone checks
isToday(new Date(timestamp))
isPast(new Date(timestamp))
```

### With These Patterns:

```tsx
// ✅ NEW: Account timezone
const { formatDate, getDateLabel, isToday } = useAccountTimezone(selectedAccountId)

formatDate(timestamp)                    // Account timezone formatting
formatDate(timestamp, 'MMM d, yyyy')     // Custom format in account timezone
getDateLabel(timestamp)                  // "Today", "Tomorrow", relative dates
isToday(timestamp)                       // Account timezone aware
```

## Special Cases

### 1. Chart Widgets
Charts use the metrics engine which already uses `local_date` columns, so they're mostly correct. Only axis labels need timezone formatting:

```tsx
// In chart components, format axis labels
const datePoints = allDays.map(day => ({
  date: formatDate(day, 'yyyy-MM-dd'),     // Use account timezone
  label: formatDate(day, 'MMM dd')         // Use account timezone
}))
```

### 2. Date Pickers
Date pickers should convert between account timezone and UTC:

```tsx
import { convertToUTC, convertToAccountTimezone } from '@/lib/timezone-utils'

// When setting date picker value (UTC → Account TZ)
const localDate = convertToAccountTimezone(utcDate, accountTimezone)

// When submitting date picker value (Account TZ → UTC)
const utcDate = convertToUTC(localDate, accountTimezone)
```

### 3. Real-time Data
For real-time updates, clear timezone cache when account changes:

```tsx
import { clearTimezoneCache } from '@/lib/timezone-utils'

useEffect(() => {
  clearTimezoneCache(selectedAccountId)
}, [selectedAccountId])
```

## Testing

### Test Different Timezones
1. Set account timezone to different values in database
2. Test with timestamps that cross day boundaries
3. Verify "Today"/"Tomorrow" labels are correct for account timezone

```sql
-- Test different timezones
UPDATE accounts SET business_timezone = 'America/New_York' WHERE id = 'your-account-id';
UPDATE accounts SET business_timezone = 'Europe/London' WHERE id = 'your-account-id';
UPDATE accounts SET business_timezone = 'Asia/Tokyo' WHERE id = 'your-account-id';
```

## Performance Notes

- Timezone API calls are cached per account
- Cache is cleared when account changes
- Fallback to UTC if timezone fetch fails
- Database aggregations already use local columns (no performance impact)

## Migration Strategy

1. **Phase 1**: Update high-priority user-facing components
2. **Phase 2**: Update medium-priority admin components  
3. **Phase 3**: Update remaining edge cases and polish

Start with components users interact with most frequently (dashboard, data views, update pages) and work down to admin/debug interfaces.

The system is designed to be backwards compatible - components without timezone support will continue to work, they just won't show account timezone dates. 