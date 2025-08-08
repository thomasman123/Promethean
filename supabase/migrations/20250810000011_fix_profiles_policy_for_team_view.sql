-- Allow moderators and admins to read profiles of users in their accounts (for team view)
CREATE POLICY IF NOT EXISTS "Moderators can read profiles for their accounts" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM account_access aa_me
      WHERE aa_me.user_id = auth.uid()
        AND aa_me.role IN ('admin','moderator')
        AND aa_me.is_active = true
        AND EXISTS (
          SELECT 1 FROM account_access aa_other
          WHERE aa_other.user_id = profiles.id
            AND aa_other.account_id = aa_me.account_id
            AND aa_other.is_active = true
        )
    )
  ); 