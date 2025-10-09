# User Linking Fix for Appointments & Discoveries

## Problem

Appointments and discoveries had sales rep/setter **names** stored but were not linked to actual **user IDs** in the system. This caused the following issues:

- Users could only see appointments/discoveries that had their user_id linked
- 105 appointments were invisible to their assigned sales reps
- 18 discoveries were unlinked

### Affected Data

**Unlinked Appointments (all in "7 Figure Sparky" account):**
- Husham Abulqasim: 66 appointments ❌
- William Wright: 17 appointments ❌
- Ryan Thompson: 13 appointments ❌
- David Bitondo: 9 appointments ❌

**Unlinked Discoveries:**
- "Unknown" setter: 18 discoveries ❌

## Solution

### 1. Database Migration
Created migration: `20250110000000_backfill_appointment_user_links.sql`

This migration:
- ✅ Links all appointments' `sales_rep` names to `sales_rep_user_id` via account_access matching
- ✅ Links all appointments' `setter` names to `setter_user_id` via account_access matching
- ✅ Links all discoveries' `setter` names to `setter_user_id` via account_access matching
- ✅ Creates a reusable database function `link_appointment_discovery_users()` for future use

### 2. Admin API Endpoint
Created: `/api/admin/link-users`

This endpoint allows admins to manually trigger the user linking process anytime. It calls the database function and returns statistics on how many records were linked.

### 3. Future Prevention

The existing webhook handler already includes user linking logic (`linkExistingUsersToData` from `@/lib/auto-user-creation`), which should prevent this issue for new appointments/discoveries going forward.

## How to Apply the Fix

### Option 1: Run Migration (Recommended)
The migration file is already in the `supabase/migrations/` folder and will run automatically on next deployment or database restart.

### Option 2: Manual Trigger via API
Once the migration has run and created the function, admins can call:

```bash
POST /api/admin/link-users
```

This will link any new unlinked records.

### Option 3: Direct SQL (if needed)
```sql
SELECT * FROM link_appointment_discovery_users();
```

## Verification

After applying the fix, verify by checking:

```sql
-- Check Husham's appointments (should be 69 total now instead of 3)
SELECT COUNT(*) FROM appointments 
WHERE sales_rep_user_id = 'ed37e0b6-a0d8-4e28-a48e-6e122a4250ff';

-- Check for any remaining unlinked appointments
SELECT sales_rep, COUNT(*) 
FROM appointments 
WHERE sales_rep IS NOT NULL AND sales_rep != '' AND sales_rep_user_id IS NULL 
GROUP BY sales_rep;
```

## Technical Details

The linking works by:
1. Matching `LOWER(TRIM(profile.full_name))` with `LOWER(TRIM(appointment.sales_rep))`
2. Ensuring the user has active account_access to the appointment's account
3. Setting the appropriate `*_user_id` field

This same logic is used by the `auto-user-creation.ts` library for new appointments.

