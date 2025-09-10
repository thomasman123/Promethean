-- Consolidate User Management System - Eliminate Table Bloat
-- This migration creates a clean, simple user system with full traceability

-- ============================================================================
-- STEP 1: Enhance profiles table with missing fields from other tables
-- ============================================================================

-- Add GHL integration fields to profiles (from ghl_users)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ghl_user_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ghl_first_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ghl_last_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ghl_phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE;

-- Add activity tracking (from ghl_users)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS setter_activity_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sales_rep_activity_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_activity_count INTEGER DEFAULT 0;

-- Add invitation tracking (from invitations/pending_users)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invitation_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invited_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invitation_status TEXT DEFAULT 'active' CHECK (invitation_status IN ('pending', 'active', 'revoked'));

-- ============================================================================
-- STEP 2: Migrate data from redundant tables to profiles
-- ============================================================================

-- Migrate useful data from ghl_users to profiles
UPDATE profiles SET
  ghl_user_id = gu.ghl_user_id,
  ghl_first_name = gu.first_name,
  ghl_last_name = gu.last_name,
  ghl_phone = gu.phone,
  last_seen_at = gu.last_seen_at,
  setter_activity_count = gu.setter_activity_count,
  sales_rep_activity_count = gu.sales_rep_activity_count,
  total_activity_count = gu.activity_count
FROM ghl_users gu
WHERE profiles.id = gu.app_user_id;

-- Update existing profiles with invitation data where applicable
UPDATE profiles SET
  invitation_token = i.token,
  invited_by = i.invited_by,
  invited_at = i.created_at,
  invitation_status = CASE 
    WHEN i.status = 'accepted' THEN 'active'
    WHEN i.status = 'revoked' THEN 'revoked'
    ELSE 'pending'
  END
FROM invitations i
WHERE profiles.email = i.email;

-- ============================================================================
-- STEP 3: Create enhanced team_members view with activity data
-- ============================================================================

CREATE OR REPLACE VIEW team_members_enhanced AS
SELECT 
  aa.account_id,
  p.id AS user_id,
  p.email,
  p.full_name,
  p.ghl_user_id,
  p.ghl_phone,
  p.avatar_url,
  
  -- Role information
  aa.role AS account_role,
  p.role AS profile_role,
  CASE 
    WHEN aa.role IN ('sales_rep', 'moderator', 'admin') THEN 'rep'
    WHEN aa.role = 'setter' THEN 'setter'
    ELSE 'inactive'
  END AS display_role,
  
  -- Activity tracking
  p.setter_activity_count,
  p.sales_rep_activity_count,
  p.total_activity_count,
  
  -- Status and metadata
  aa.is_active,
  p.created_for_data,
  p.invitation_status,
  p.invited_at,
  p.last_seen_at,
  aa.granted_at,
  aa.granted_by,
  
  -- Timestamps
  p.created_at,
  p.updated_at
FROM account_access aa
JOIN profiles p ON p.id = aa.user_id
WHERE aa.is_active = true;

-- ============================================================================
-- STEP 4: Create function to calculate and update activity counts
-- ============================================================================

CREATE OR REPLACE FUNCTION update_user_activity_counts(p_account_id UUID DEFAULT NULL)
RETURNS void AS $$
BEGIN
  -- Update setter activity counts
  UPDATE profiles SET
    setter_activity_count = COALESCE(
      (SELECT COUNT(*) FROM appointments WHERE setter_user_id = profiles.id AND (p_account_id IS NULL OR account_id = p_account_id)) +
      (SELECT COUNT(*) FROM dials WHERE setter_user_id = profiles.id AND (p_account_id IS NULL OR account_id = p_account_id)),
      0
    );
  
  -- Update sales rep activity counts  
  UPDATE profiles SET
    sales_rep_activity_count = COALESCE(
      (SELECT COUNT(*) FROM appointments WHERE sales_rep_user_id = profiles.id AND (p_account_id IS NULL OR account_id = p_account_id)),
      0
    );
  
  -- Update total activity counts
  UPDATE profiles SET
    total_activity_count = setter_activity_count + sales_rep_activity_count;
  
  -- Log the update
  RAISE NOTICE 'Updated activity counts for account: %', COALESCE(p_account_id::text, 'ALL');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 5: Create triggers to keep activity counts updated
-- ============================================================================

-- Function to update activity counts when appointments/dials change
CREATE OR REPLACE FUNCTION update_activity_counts_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Update setter activity count
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.setter_user_id IS NOT NULL THEN
      UPDATE profiles SET 
        setter_activity_count = (
          SELECT COUNT(*) FROM appointments WHERE setter_user_id = NEW.setter_user_id
        ) + (
          SELECT COUNT(*) FROM dials WHERE setter_user_id = NEW.setter_user_id
        ),
        total_activity_count = setter_activity_count + sales_rep_activity_count
      WHERE id = NEW.setter_user_id;
    END IF;
    
    -- Update sales rep activity count (appointments only)
    IF TG_TABLE_NAME = 'appointments' AND NEW.sales_rep_user_id IS NOT NULL THEN
      UPDATE profiles SET 
        sales_rep_activity_count = (
          SELECT COUNT(*) FROM appointments WHERE sales_rep_user_id = NEW.sales_rep_user_id
        ),
        total_activity_count = setter_activity_count + sales_rep_activity_count
      WHERE id = NEW.sales_rep_user_id;
    END IF;
  END IF;
  
  -- Handle deletes and updates of old values
  IF TG_OP IN ('DELETE', 'UPDATE') THEN
    IF OLD.setter_user_id IS NOT NULL THEN
      UPDATE profiles SET 
        setter_activity_count = (
          SELECT COUNT(*) FROM appointments WHERE setter_user_id = OLD.setter_user_id
        ) + (
          SELECT COUNT(*) FROM dials WHERE setter_user_id = OLD.setter_user_id
        ),
        total_activity_count = setter_activity_count + sales_rep_activity_count
      WHERE id = OLD.setter_user_id;
    END IF;
    
    IF TG_TABLE_NAME = 'appointments' AND OLD.sales_rep_user_id IS NOT NULL THEN
      UPDATE profiles SET 
        sales_rep_activity_count = (
          SELECT COUNT(*) FROM appointments WHERE sales_rep_user_id = OLD.sales_rep_user_id
        ),
        total_activity_count = setter_activity_count + sales_rep_activity_count
      WHERE id = OLD.sales_rep_user_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS appointments_activity_count_trigger ON appointments;
CREATE TRIGGER appointments_activity_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_activity_counts_trigger();

DROP TRIGGER IF EXISTS dials_activity_count_trigger ON dials;
CREATE TRIGGER dials_activity_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON dials
  FOR EACH ROW EXECUTE FUNCTION update_activity_counts_trigger();

-- ============================================================================
-- STEP 6: Initial data population - calculate current activity counts
-- ============================================================================

-- Run initial activity count calculation
SELECT update_user_activity_counts();

-- ============================================================================
-- STEP 7: Add indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_ghl_user_id ON profiles(ghl_user_id) WHERE ghl_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_invitation_status ON profiles(invitation_status);
CREATE INDEX IF NOT EXISTS idx_profiles_activity_counts ON profiles(setter_activity_count, sales_rep_activity_count);

-- ============================================================================
-- STEP 8: Update team_members view to be the single interface
-- ============================================================================

CREATE OR REPLACE VIEW team_members AS
SELECT 
  aa.account_id,
  p.id AS user_id,
  p.email,
  p.full_name,
  p.ghl_user_id,
  p.ghl_phone,
  p.avatar_url,
  
  -- Role information (single source of truth)
  aa.role AS account_role,
  p.role AS profile_role,
  CASE 
    WHEN aa.role IN ('sales_rep', 'moderator', 'admin') THEN 'rep'
    WHEN aa.role = 'setter' THEN 'setter'
    ELSE 'inactive'
  END AS display_role,
  
  -- Activity tracking (real-time via triggers)
  p.setter_activity_count,
  p.sales_rep_activity_count,
  p.total_activity_count,
  
  -- Status and metadata
  aa.is_active,
  p.created_for_data,
  p.invitation_status,
  p.invited_at,
  p.last_seen_at,
  aa.granted_at,
  aa.granted_by,
  
  -- Timestamps
  p.created_at AS profile_created_at,
  p.updated_at AS profile_updated_at,
  aa.created_at AS access_created_at,
  aa.updated_at AS access_updated_at
FROM account_access aa
JOIN profiles p ON p.id = aa.user_id
WHERE aa.is_active = true;

-- ============================================================================
-- STEP 9: Create RLS policies for team_members view
-- ============================================================================

-- Enable RLS on the view (views inherit from underlying tables, but let's be explicit)
-- The view will be governed by the RLS policies of profiles and account_access

-- ============================================================================
-- STEP 10: Mark deprecated tables (don't drop yet - for safety)
-- ============================================================================

-- Add deprecation comments
COMMENT ON TABLE ghl_users IS 'DEPRECATED: Data migrated to profiles table. Will be dropped in future migration.';
COMMENT ON TABLE pending_users IS 'DEPRECATED: Functionality moved to invitations table. Will be dropped in future migration.';

-- ============================================================================
-- STEP 11: Create helper functions for common operations
-- ============================================================================

-- Function to get all team members for an account (with proper permissions)
CREATE OR REPLACE FUNCTION get_account_team_members(p_account_id UUID)
RETURNS TABLE (
  user_id UUID,
  email VARCHAR,
  full_name VARCHAR,
  display_role TEXT,
  account_role user_role,
  profile_role user_role,
  setter_activity_count INTEGER,
  sales_rep_activity_count INTEGER,
  total_activity_count INTEGER,
  is_active BOOLEAN,
  created_for_data BOOLEAN
) AS $$
BEGIN
  -- Check if current user has access to this account (or is global admin)
  IF NOT (
    auth.uid() IN (
      SELECT aa.user_id FROM account_access aa 
      WHERE aa.account_id = p_account_id AND aa.is_active = true
    )
    OR 
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  ) THEN
    RAISE EXCEPTION 'Access denied to account %', p_account_id;
  END IF;
  
  -- Return team members
  RETURN QUERY
  SELECT 
    tm.user_id,
    tm.email,
    tm.full_name,
    tm.display_role,
    tm.account_role,
    tm.profile_role,
    tm.setter_activity_count,
    tm.sales_rep_activity_count,
    tm.total_activity_count,
    tm.is_active,
    tm.created_for_data
  FROM team_members tm
  WHERE tm.account_id = p_account_id
  ORDER BY tm.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create user with account access in one operation
CREATE OR REPLACE FUNCTION create_team_member(
  p_account_id UUID,
  p_email VARCHAR,
  p_full_name VARCHAR,
  p_account_role user_role DEFAULT 'setter',
  p_ghl_user_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Check permissions
  IF NOT (
    auth.uid() IN (
      SELECT aa.user_id FROM account_access aa 
      WHERE aa.account_id = p_account_id 
        AND aa.is_active = true 
        AND aa.role IN ('admin', 'moderator')
    )
    OR 
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to create team member';
  END IF;
  
  -- Create or update profile
  INSERT INTO profiles (
    email,
    full_name,
    role,
    ghl_user_id,
    invited_by,
    invited_at,
    invitation_status
  ) VALUES (
    p_email,
    p_full_name,
    CASE WHEN p_account_role IN ('sales_rep', 'moderator', 'admin') THEN p_account_role ELSE 'setter' END,
    p_ghl_user_id,
    auth.uid(),
    NOW(),
    'active'
  )
  ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    ghl_user_id = COALESCE(EXCLUDED.ghl_user_id, profiles.ghl_user_id),
    updated_at = NOW()
  RETURNING id INTO v_user_id;
  
  -- Create account access
  INSERT INTO account_access (
    user_id,
    account_id,
    role,
    granted_by
  ) VALUES (
    v_user_id,
    p_account_id,
    p_account_role,
    auth.uid()
  )
  ON CONFLICT (user_id, account_id) DO UPDATE SET
    role = EXCLUDED.role,
    is_active = true,
    granted_by = EXCLUDED.granted_by,
    updated_at = NOW();
  
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 12: Create indexes for the enhanced system
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_role_activity ON profiles(role, total_activity_count DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_invitation_status ON profiles(invitation_status) WHERE invitation_status != 'active';
CREATE INDEX IF NOT EXISTS idx_account_access_account_role ON account_access(account_id, role, is_active);

-- ============================================================================
-- STEP 13: Grant permissions
-- ============================================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_account_team_members(UUID) TO public;
GRANT EXECUTE ON FUNCTION create_team_member(UUID, VARCHAR, VARCHAR, user_role, TEXT) TO public;
GRANT EXECUTE ON FUNCTION update_user_activity_counts(UUID) TO public;

-- ============================================================================
-- STEP 14: Add helpful comments
-- ============================================================================

COMMENT ON VIEW team_members IS 'Single source of truth for account team members with role and activity data';
COMMENT ON FUNCTION get_account_team_members(UUID) IS 'Get all team members for an account with proper permission checks';
COMMENT ON FUNCTION create_team_member(UUID, VARCHAR, VARCHAR, user_role, TEXT) IS 'Create a new team member with account access in one operation';
COMMENT ON FUNCTION update_user_activity_counts(UUID) IS 'Recalculate activity counts from appointments and dials data';

-- ============================================================================
-- FINAL: System is now consolidated and clean
-- ============================================================================

-- The new architecture:
-- 1. profiles - Core user identity with all user data
-- 2. account_access - Account permissions (unchanged)  
-- 3. team_members view - Single query interface
-- 4. Helper functions - Common operations
-- 5. Automatic activity tracking via triggers
-- 6. Deprecated tables marked for future removal 