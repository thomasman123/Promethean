-- Fix data_tables RLS policy to allow global admins to create tables for any account
-- This fixes the issue where global admins can't create tables for accounts they don't have explicit account_access to

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users can create data tables for their account" ON data_tables;

-- Create a new policy that allows:
-- 1. Users with account_access to create tables for their accounts
-- 2. Global admins (profile role = 'admin') to create tables for any account
CREATE POLICY "Users can create data tables for accessible accounts" ON data_tables
    FOR INSERT
    WITH CHECK (
        -- User has explicit account access
        (account_id IN (
            SELECT aa.account_id
            FROM account_access aa
            WHERE aa.user_id = auth.uid()
            AND aa.is_active = true
        ))
        OR
        -- User is a global admin (can create tables for any account)
        (EXISTS (
            SELECT 1 
            FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'admin'
        ))
    );

-- Also update the SELECT policy to be consistent
DROP POLICY IF EXISTS "Users can view data tables for their account" ON data_tables;

CREATE POLICY "Users can view data tables for accessible accounts" ON data_tables
    FOR SELECT
    USING (
        -- User has explicit account access
        (account_id IN (
            SELECT aa.account_id
            FROM account_access aa
            WHERE aa.user_id = auth.uid()
            AND aa.is_active = true
        ))
        OR
        -- User is a global admin (can view tables for any account)
        (EXISTS (
            SELECT 1 
            FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'admin'
        ))
    );

-- Update the UPDATE policy to be consistent
DROP POLICY IF EXISTS "Users can update data tables for their account" ON data_tables;

CREATE POLICY "Users can update data tables for accessible accounts" ON data_tables
    FOR UPDATE
    USING (
        -- User has explicit account access
        (account_id IN (
            SELECT aa.account_id
            FROM account_access aa
            WHERE aa.user_id = auth.uid()
            AND aa.is_active = true
        ))
        OR
        -- User is a global admin (can update tables for any account)
        (EXISTS (
            SELECT 1 
            FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'admin'
        ))
    );

-- Update the DELETE policy to be consistent
DROP POLICY IF EXISTS "Users can delete data tables for their account" ON data_tables;

CREATE POLICY "Users can delete data tables for accessible accounts" ON data_tables
    FOR DELETE
    USING (
        -- User has explicit account access
        (account_id IN (
            SELECT aa.account_id
            FROM account_access aa
            WHERE aa.user_id = auth.uid()
            AND aa.is_active = true
        ))
        OR
        -- User is a global admin (can delete tables for any account)
        (EXISTS (
            SELECT 1 
            FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'admin'
        ))
    ); 