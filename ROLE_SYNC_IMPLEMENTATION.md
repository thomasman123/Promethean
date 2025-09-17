# Role Synchronization System

This document explains the role synchronization system between the `profiles` table and `account_access` table in the Promethean application.

## Problem

Previously, the `profiles.role` field and `account_access.role` field were disconnected and could become out of sync, leading to inconsistent permissions and user experience issues.

## Solution

We've implemented an automatic bidirectional synchronization system using PostgreSQL triggers and functions.

## How It Works

### 1. Database Triggers

**Profile Role Changes → Account Access**
- When a user's role is updated in the `profiles` table, all their `account_access` records are automatically updated to match
- Trigger: `sync_profile_role_trigger` on `profiles` table
- Function: `sync_profile_role_to_account_access()`

**Account Access Changes → Profile** 
- When a user's role is updated in `account_access`, their `profiles.role` is updated to match
- Only applies to the user's "primary" account (first account_access record by creation date)
- Trigger: `sync_account_access_role_trigger` on `account_access` table  
- Function: `sync_account_access_role_to_profile()`

### 2. Migration Strategy

The migration uses `profiles.role` as the source of truth and updates all `account_access` records to match:

```sql
UPDATE account_access 
SET role = p.role, updated_at = NOW()
FROM profiles p
WHERE account_access.user_id = p.id 
AND account_access.role != p.role;
```

### 3. Utility Functions

**Manual Sync Function**
```sql
SELECT * FROM manual_sync_all_roles();
```
- Manually syncs all roles from profiles to account_access
- Returns a report of what was updated
- Useful for one-time fixes or verification

**Role Sync Status View**
```sql
SELECT * FROM role_sync_status;
```
- Shows synchronization status for all users
- Identifies mismatches, users without account access, etc.
- Status values: `SYNCED`, `MISMATCH`, `NO_ACCOUNT_ACCESS`

## User Role Enum

Both tables use the `user_role` enum with these values:
- `admin` - Full system access
- `moderator` - Account management access  
- `sales_rep` - Sales representative access
- `setter` - Lead setter access

## Usage Examples

### Check for Role Mismatches
```sql
SELECT * FROM role_sync_status 
WHERE sync_status = 'MISMATCH';
```

### Update a User's Role (Automatic Sync)
```sql
-- This will automatically update all account_access records
UPDATE profiles 
SET role = 'sales_rep' 
WHERE email = 'user@example.com';
```

### Manual Sync All Roles
```sql
-- Fix any existing mismatches
SELECT * FROM manual_sync_all_roles();
```

## Implementation Files

- **Migration**: `supabase/migrations/20250129000001_sync_profiles_account_access_roles.sql`
- **Test Script**: `scripts/sync-roles-setup.sql`
- **Documentation**: `ROLE_SYNC_IMPLEMENTATION.md`

## Testing

The system includes comprehensive testing:

1. **Initial State Check**: Identifies existing mismatches
2. **Manual Sync Test**: Applies the sync function and verifies results
3. **Trigger Test**: Updates a test user's role and verifies automatic sync
4. **Final Verification**: Confirms no mismatches remain

Run the test script:
```sql
\i scripts/sync-roles-setup.sql
```

## Benefits

1. **Consistency**: Roles are always synchronized between tables
2. **Automatic**: No manual intervention required for role changes
3. **Bidirectional**: Works whether you update profiles or account_access
4. **Auditable**: All changes are logged with timestamps
5. **Safe**: Primary account logic prevents conflicts for multi-account users

## Considerations

- **Primary Account Logic**: For users with multiple account_access records, only the primary (first) account determines the profile role
- **Performance**: Triggers add minimal overhead to role updates
- **Logging**: All sync operations are logged with `RAISE NOTICE`
- **Backwards Compatible**: Existing code continues to work unchanged

## Troubleshooting

### Check Sync Status
```sql
SELECT * FROM role_sync_status;
```

### Force Manual Sync
```sql
SELECT * FROM manual_sync_all_roles();
```

### View Recent Role Changes
```sql
SELECT * FROM role_sync_status 
ORDER BY profile_updated_at DESC, account_access_updated_at DESC;
```

This system ensures that the `profiles.role` and `account_access.role` fields remain synchronized automatically, eliminating the previous disconnection issues. 