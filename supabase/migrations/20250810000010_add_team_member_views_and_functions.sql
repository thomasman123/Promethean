-- Invitations table for onboarding team members by email
CREATE TABLE IF NOT EXISTS invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role user_role DEFAULT 'setter' NOT NULL,
  invited_by UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked')),
  token TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Simple RLS: moderators/admins of the account can manage
CREATE POLICY "Account moderators can manage invitations" ON invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM account_access aa
      WHERE aa.user_id = auth.uid()
        AND aa.account_id = invitations.account_id
        AND aa.role IN ('admin','moderator')
        AND aa.is_active = true
    )
  );

-- View of team members per account (profiles joined via account_access)
CREATE OR REPLACE VIEW team_members AS
SELECT 
  aa.account_id,
  p.id AS user_id,
  p.email,
  p.full_name,
  aa.role,
  aa.is_active,
  aa.granted_at
FROM account_access aa
JOIN profiles p ON p.id = aa.user_id
WHERE aa.is_active = true;

-- Function: link a profile to an account (grants access) and backfill appointments/dials
CREATE OR REPLACE FUNCTION link_user_to_account_and_backfill(
  p_account_id UUID,
  p_email VARCHAR,
  p_full_name VARCHAR,
  p_role user_role DEFAULT 'setter'
) RETURNS TABLE (user_id UUID, invited BOOLEAN) AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_access account_access%ROWTYPE;
  v_user_id UUID;
  v_invited BOOLEAN := false;
BEGIN
  -- Find or create profile stub by email (if not exists). We do not create auth.users here.
  SELECT * INTO v_profile FROM profiles WHERE lower(email) = lower(p_email);
  IF NOT FOUND THEN
    -- Create a stub profile row with a random UUID; actual auth.users will be created on invite accept
    v_user_id := gen_random_uuid();
    INSERT INTO profiles (id, email, full_name, role, is_active)
    VALUES (v_user_id, p_email, p_full_name, p_role, true);
  ELSE
    v_user_id := v_profile.id;
  END IF;

  -- Grant or update access
  SELECT * INTO v_access FROM grant_account_access(v_user_id, p_account_id, p_role, auth.uid());

  -- Backfill existing rows by matching setter/sales_rep/email/name heuristics
  -- Appointments: setter/sales_rep text fields may equal the email or name
  UPDATE appointments SET setter_user_id = v_user_id
    WHERE account_id = p_account_id
      AND (lower(setter) = lower(p_email) OR lower(setter) = lower(coalesce(p_full_name, '')))
      AND setter_user_id IS DISTINCT FROM v_user_id;

  UPDATE appointments SET sales_rep_user_id = v_user_id
    WHERE account_id = p_account_id
      AND (lower(sales_rep) = lower(p_email) OR lower(sales_rep) = lower(coalesce(p_full_name, '')))
      AND sales_rep_user_id IS DISTINCT FROM v_user_id;

  -- Dials
  UPDATE dials SET setter_user_id = v_user_id
    WHERE (lower(setter) = lower(p_email) OR lower(setter) = lower(coalesce(p_full_name, '')))
      AND setter_user_id IS DISTINCT FROM v_user_id;

  RETURN QUERY SELECT v_user_id, v_invited;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: create invitation and return token
CREATE OR REPLACE FUNCTION create_invitation(
  p_account_id UUID,
  p_email VARCHAR,
  p_full_name VARCHAR,
  p_role user_role DEFAULT 'setter'
) RETURNS invitations AS $$
DECLARE
  v_token TEXT := encode(gen_random_bytes(24), 'base64');
  v_inv invitations%ROWTYPE;
BEGIN
  INSERT INTO invitations (account_id, email, full_name, role, invited_by, token, status)
  VALUES (p_account_id, p_email, p_full_name, p_role, auth.uid(), v_token, 'pending')
  RETURNING * INTO v_inv;
  RETURN v_inv;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: accept invitation (caller must be the invited email's auth user)
CREATE OR REPLACE FUNCTION accept_invitation(p_token TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_inv invitations%ROWTYPE;
BEGIN
  SELECT * INTO v_inv FROM invitations WHERE token = p_token AND status = 'pending';
  IF NOT FOUND THEN RETURN FALSE; END IF;

  -- Ensure a profile exists for auth.uid
  INSERT INTO profiles (id, email, full_name)
  VALUES (auth.uid(), auth.email(), NULL)
  ON CONFLICT (id) DO NOTHING;

  -- Grant access and mark accepted
  PERFORM grant_account_access(auth.uid(), v_inv.account_id, v_inv.role, v_inv.invited_by);
  UPDATE invitations SET status = 'accepted', accepted_at = NOW() WHERE id = v_inv.id;

  -- Backfill for this known email
  PERFORM link_user_to_account_and_backfill(v_inv.account_id, v_inv.email, v_inv.full_name, v_inv.role);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 