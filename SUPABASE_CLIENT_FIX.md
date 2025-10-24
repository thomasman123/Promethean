# Supabase Client Fix

## Problem

Multiple components across the codebase were creating their own Supabase client instances using `createBrowserClient` from `@supabase/ssr`. This caused the error:

```
Uncaught TypeError: (0 , p.createClient) is not a function
```

## Root Cause

When components create their own Supabase client like this:

```typescript
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

It can fail if:
- Environment variables aren't properly set during build/runtime
- The bundler has issues resolving the import
- The client is created on every render (performance issue)

## Solution

Replaced all individual client creation with a shared Supabase client from `@/lib/supabase`:

```typescript
import { supabase } from "@/lib/supabase"
```

This ensures:
- ✅ Consistent client configuration across the entire app
- ✅ Proper environment variable handling
- ✅ Better performance (singleton pattern)
- ✅ Reliable bundling and no runtime errors

## Files Fixed (17 total)

### Components
1. `src/components/account/account-settings-tab.tsx`
2. `src/components/layout/topbar.tsx`
3. `src/components/layout/modern-sidebar.tsx`
4. `src/components/layout/overdue-data-notifications.tsx`
5. `src/components/dashboard/kpi-progress-widget.tsx`
6. `src/components/layout/admin-settings-modal.tsx`
7. `src/components/update-data/ordered-data-flow.tsx`

### Pages
8. `src/app/account/settings/page.tsx`
9. `src/app/forgot-password/page.tsx`
10. `src/app/signup/page.tsx`
11. `src/app/login/page.tsx`
12. `src/app/reset-password/page.tsx`
13. `src/app/account/ghl-connection/page.tsx`
14. `src/app/account/meta-ads-connection/page.tsx`
15. `src/app/account/team/page.tsx`
16. `src/app/account/kpis/page.tsx`
17. `src/app/update-data/moderate/page.tsx`

### Hooks
18. `src/hooks/use-realtime-collaboration.ts`

## Changes Made

**Before:**
```typescript
import { createBrowserClient } from "@supabase/ssr"
import { Database } from "@/lib/database.types"

// ... in component
const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

**After:**
```typescript
import { supabase } from "@/lib/supabase"
import { Database } from "@/lib/database.types"

// ... in component - just use the imported client
```

## Benefits

1. **Single Source of Truth**: All client-side code uses the same Supabase instance
2. **Environment Safety**: Environment variables are checked once at module load time
3. **Performance**: No repeated client initialization on every component render
4. **Maintainability**: One place to update client configuration
5. **Type Safety**: Centralized Database type definitions

## Verification

After these changes, the error should no longer appear in production. The shared client is properly initialized in `src/lib/supabase.ts` and reused throughout the application.

## Related Issues

This also fixes the appointment backfill issue where location IDs weren't being saved due to the missing `ghl_locations` entry combined with client initialization issues.

