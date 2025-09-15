-- Clear all data from tables while preserving structure
-- Starting with dependent tables first to respect foreign key constraints

-- Delete notifications and follow-ups first
DELETE FROM follow_up_notifications;
DELETE FROM follow_ups;

-- Delete payment data
DELETE FROM appointment_payments;

-- Delete dashboard and configuration data
DELETE FROM dashboard_filter_presets;
DELETE FROM dashboard_views;
DELETE FROM data_tables;

-- Delete attribution and mapping data
DELETE FROM utm_attribution_mappings;
DELETE FROM contact_source_mappings;
DELETE FROM contact_attribution_rules;
DELETE FROM account_utm_rules;
DELETE FROM account_attribution_settings;
DELETE FROM ghl_source_mappings;
DELETE FROM campaign_attribution;

-- Delete calendar mappings
DELETE FROM calendar_mappings;

-- Delete user management data
DELETE FROM pending_users;
DELETE FROM ghl_users;
DELETE FROM invitations;
DELETE FROM account_access;

-- Delete webhook logs
DELETE FROM webhook_logs;

-- Delete core activity data
DELETE FROM dials;
DELETE FROM discoveries;
DELETE FROM appointments;

-- Delete contacts
DELETE FROM contacts;

-- Delete user profiles (keeping auth.users intact)
-- Only delete profiles that don't have corresponding auth.users entries
DELETE FROM profiles WHERE id NOT IN (SELECT id FROM auth.users);

-- Finally delete accounts
DELETE FROM accounts;

-- Note: Keeping source_categories as they are reference data
-- These are used as lookup values and should be preserved 