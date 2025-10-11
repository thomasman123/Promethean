# Setter Backfill and Prevention Guide

## Problem
Many appointments and discoveries have `setter = "Unknown"` because the webhook didn't include user information or the GHL API calls failed.

## Solution Implemented

### 1. **Improved Webhook Logic** (Prevents Future Issues)

The appointment/discovery webhook now uses a **robust 3-tier strategy** to resolve setter information:

#### Primary Strategy: Fetch from GHL Appointment API (ALWAYS)
- **Always** fetches the appointment from GHL API first
- Extracts `createdBy.userId` from the appointment data
- Fetches user details and links to platform users
- **Most reliable method** (85% success rate proven by backfill)
- Includes automatic token refresh retry if needed

#### Fallback Strategy 1: payload.userId
- If primary strategy fails, tries `payload.userId` from webhook
- Fetches user details from GHL API
- Links to platform users by email

#### Fallback Strategy 2: Recent Dial Lookup
- If both above strategies fail, searches for recent dials from the same contact
- Looks for dials within 60 minutes before the appointment was booked
- Uses the setter from the most recent matching dial

#### Final Fallback: "Unknown"
- Only defaults to "Unknown" if all strategies fail
- Logs a clear warning when this happens

**Files Modified:**
- `src/app/api/webhook/call-events/route.ts` - Enhanced `processAppointmentWebhook()` function

### 2. **SQL Backfill Script** (Fixes Existing Data)

Created a migration that backfills appointments and discoveries with "Unknown" setter using linked dials.

**Strategy:**
- Finds all appointments/discoveries with "Unknown" setter
- Matches them to dials from the same contact
- Uses dials within 60 minutes BEFORE the appointment was booked
- Updates with setter name and setter_user_id from the dial

**File Created:**
- `supabase/migrations/20251011120000_backfill_unknown_setters.sql`

**To run the backfill:**

```bash
# Option 1: Via Supabase CLI (requires database connection)
npx supabase db push

# Option 2: Via SQL editor in Supabase dashboard
# Copy and paste the migration file contents
```

### 3. **Existing API Backfill Endpoint** (Alternative Method)

There's also an existing admin endpoint that backfills setters from the GHL API:

**Endpoint:** `POST /api/admin/backfill-setters`

**What it does:**
- Fetches all appointments with `setter = "Unknown"`
- Looks up each appointment in GHL API
- Extracts the `createdBy.userId`
- Fetches user details and updates the appointment

**To use:**
1. Log in as an admin user
2. Send a POST request to `/api/admin/backfill-setters`
3. Monitor the response for success/failure statistics

**Note:** This method requires valid GHL API access tokens and is slower (makes API calls for each appointment) but more accurate for appointments that don't have matching dials.

## Recommended Backfill Process

### Step 1: Run SQL Migration (Fast, uses existing dial data)
```bash
npx supabase db push
```

This will:
- Update appointments/discoveries that have matching dials
- Be very fast (single SQL query)
- Show summary of how many records were updated

### Step 2: Use API Endpoint (For remaining records)
For any remaining "Unknown" setters that couldn't be resolved from dials:

```bash
# Make a POST request to the admin endpoint
curl -X POST https://your-domain.com/api/admin/backfill-setters \
  -H "Cookie: your-session-cookie"
```

This will:
- Fetch from GHL API
- Be slower but cover records without matching dials
- Show detailed progress and errors

## Monitoring

After backfilling, check remaining "Unknown" setters:

```sql
-- Check appointments
SELECT COUNT(*) 
FROM appointments 
WHERE setter = 'Unknown' OR setter IS NULL OR setter = '';

-- Check discoveries
SELECT COUNT(*) 
FROM discoveries 
WHERE setter = 'Unknown' OR setter IS NULL OR setter = '';
```

## Prevention

With the improved webhook logic, new appointments/discoveries should rarely have "Unknown" setter. If they do:

1. Check webhook logs for the specific appointment
2. Look for warning: `⚠️ WARNING: Could not resolve setter through any strategy, defaulting to "Unknown"`
3. Common causes:
   - No userId in webhook payload
   - GHL API token expired/invalid
   - Contact not linked (no contact_id)
   - No recent dials from that contact
   - Appointment doesn't exist in GHL API (edge case)

## Backfill Results (October 2025)

Initial state: **105 appointments** with "Unknown" setter

After SQL backfill (from dials): Still 105 Unknown (no matching dials within 60min window)

After GHL API backfill:
- ✅ **Successfully updated: 89 appointments (85%)**
- ❌ **Failed: 16 appointments (15%)**
  - 15 failed: GHL user `6yTdjpjtU5V0rszpklbC` no longer exists in GHL
  - 1 failed: Appointment has no creator (`createdBy.userId` is null)

**Key Fix Applied:** GHL API returns data under `appointment` key, not `event` key

## Summary

- ✅ **Webhook improved** - Now ALWAYS fetches from GHL API as primary strategy (85% proven success)
- ✅ **3-tier strategy** - GHL API (primary) → payload.userId → recent dials → Unknown
- ✅ **SQL backfill** - Fast bulk update using existing dial data
- ✅ **API backfill** - Detailed backfill from GHL API for remaining records (85% success)
- ✅ **Handles both** appointments and discoveries
- ✅ **Clear logging** - Easy to debug when setter can't be resolved
- ✅ **Critical bug fixed** - Correctly parse GHL API responses using `appointment` key
- ✅ **Production ready** - New appointments will automatically get correct setter info

## Files Changed

1. `supabase/migrations/20251011120000_backfill_unknown_setters.sql` - New migration
2. `src/app/api/webhook/call-events/route.ts` - Enhanced webhook logic
3. `SETTER_BACKFILL_GUIDE.md` - This documentation

