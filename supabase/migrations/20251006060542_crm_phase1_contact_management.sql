-- ============================================
-- CRM PHASE 1: CONTACT MANAGEMENT SYSTEM
-- ============================================
-- This migration extends the existing contacts table and adds
-- CRM-specific tables for activities, custom fields, smart views, and lead statuses

-- ============================================
-- PART 1: EXTEND CONTACTS TABLE
-- ============================================

-- Make ghl_contact_id nullable (for native contacts not from GHL)
ALTER TABLE contacts ALTER COLUMN ghl_contact_id DROP NOT NULL;

-- Add check constraint: must have either ghl_contact_id OR a name
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_ghl_or_native_check;
ALTER TABLE contacts ADD CONSTRAINT contacts_ghl_or_native_check 
  CHECK (ghl_contact_id IS NOT NULL OR first_name IS NOT NULL OR name IS NOT NULL);

-- Add CRM-specific fields to contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lead_status VARCHAR(100) DEFAULT 'new';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lead_status_updated_at TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS company VARCHAR(255);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS job_title VARCHAR(255);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS website VARCHAR(500);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS linkedin VARCHAR(500);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS twitter VARCHAR(255);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS facebook VARCHAR(500);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS instagram VARCHAR(255);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS contact_count INTEGER DEFAULT 0;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES profiles(id);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS do_not_contact BOOLEAN DEFAULT FALSE;

-- Create indexes for new contact fields
CREATE INDEX IF NOT EXISTS idx_contacts_lead_status ON contacts(account_id, lead_status) WHERE NOT is_archived;
CREATE INDEX IF NOT EXISTS idx_contacts_assigned_user ON contacts(assigned_user_id) WHERE NOT is_archived;
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(account_id, company) WHERE company IS NOT NULL AND NOT is_archived;
CREATE INDEX IF NOT EXISTS idx_contacts_archived ON contacts(account_id, is_archived, archived_at);
CREATE INDEX IF NOT EXISTS idx_contacts_last_contacted ON contacts(account_id, last_contacted_at DESC NULLS LAST) WHERE NOT is_archived;
CREATE INDEX IF NOT EXISTS idx_contacts_created ON contacts(account_id, created_at DESC) WHERE NOT is_archived;

-- ============================================
-- PART 2: LEAD STATUSES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS lead_statuses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#6B7280', -- Hex color code
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(account_id, name)
);

-- RLS for lead_statuses
ALTER TABLE lead_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view lead statuses for accessible accounts" ON lead_statuses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM account_access aa
      WHERE aa.account_id = lead_statuses.account_id
      AND aa.user_id = auth.uid()
      AND aa.is_active = true
    )
  );

CREATE POLICY "Admins can manage lead statuses" ON lead_statuses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM account_access aa
      WHERE aa.account_id = lead_statuses.account_id
      AND aa.user_id = auth.uid()
      AND aa.role IN ('admin', 'moderator')
      AND aa.is_active = true
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lead_statuses_account ON lead_statuses(account_id, display_order) WHERE is_active = TRUE;

-- Trigger for updated_at
CREATE TRIGGER update_lead_statuses_updated_at BEFORE UPDATE ON lead_statuses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default lead statuses for all existing accounts
INSERT INTO lead_statuses (account_id, name, color, display_order, is_default)
SELECT id, 'New', '#3B82F6', 1, TRUE FROM accounts
ON CONFLICT (account_id, name) DO NOTHING;

INSERT INTO lead_statuses (account_id, name, color, display_order)
SELECT id, 'Contacted', '#8B5CF6', 2 FROM accounts
ON CONFLICT (account_id, name) DO NOTHING;

INSERT INTO lead_statuses (account_id, name, color, display_order)
SELECT id, 'Qualified', '#10B981', 3 FROM accounts
ON CONFLICT (account_id, name) DO NOTHING;

INSERT INTO lead_statuses (account_id, name, color, display_order)
SELECT id, 'Unqualified', '#EF4444', 4 FROM accounts
ON CONFLICT (account_id, name) DO NOTHING;

-- ============================================
-- PART 3: CONTACT ACTIVITIES TABLE
-- ============================================

-- Create activity type enum
DO $$ BEGIN
  CREATE TYPE activity_type AS ENUM (
    'note',
    'email', 
    'call',
    'sms',
    'meeting',
    'task',
    'status_change',
    'field_change',
    'appointment_created',
    'appointment_updated'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create activity direction enum
DO $$ BEGIN
  CREATE TYPE activity_direction AS ENUM ('inbound', 'outbound', 'internal');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS contact_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- NULL for system activities
  
  activity_type activity_type NOT NULL,
  activity_direction activity_direction,
  
  -- Common fields
  subject VARCHAR(500),
  body TEXT,
  
  -- Email specific
  email_message_id VARCHAR(255), -- For threading
  email_from VARCHAR(255),
  email_to TEXT[], -- Array of recipients
  email_cc TEXT[],
  email_bcc TEXT[],
  email_html TEXT,
  
  -- Call specific  
  call_duration_seconds INTEGER,
  call_recording_url TEXT,
  call_outcome VARCHAR(50),
  call_phone_number VARCHAR(50),
  
  -- SMS specific
  sms_from VARCHAR(50),
  sms_to VARCHAR(50),
  
  -- Task specific
  task_due_date TIMESTAMPTZ,
  task_completed BOOLEAN DEFAULT FALSE,
  task_completed_at TIMESTAMPTZ,
  task_completed_by UUID REFERENCES profiles(id),
  task_priority VARCHAR(20) CHECK (task_priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- Meeting specific
  meeting_start_time TIMESTAMPTZ,
  meeting_end_time TIMESTAMPTZ,
  meeting_location TEXT,
  
  -- Change tracking (for status_change, field_change)
  change_field VARCHAR(100),
  change_old_value TEXT,
  change_new_value TEXT,
  
  -- Metadata
  metadata JSONB,
  
  -- External IDs (for synced activities)
  external_id VARCHAR(255),
  external_source VARCHAR(50), -- 'ghl', 'gmail', 'outlook', etc.
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS for contact_activities
ALTER TABLE contact_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activities for accessible contacts" ON contact_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM account_access aa
      WHERE aa.account_id = contact_activities.account_id
      AND aa.user_id = auth.uid()
      AND aa.is_active = true
    )
  );

CREATE POLICY "Users can create activities for accessible contacts" ON contact_activities
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM account_access aa
      WHERE aa.account_id = contact_activities.account_id
      AND aa.user_id = auth.uid()
      AND aa.is_active = true
    )
  );

CREATE POLICY "Users can update their own activities" ON contact_activities
  FOR UPDATE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM account_access aa
      WHERE aa.account_id = contact_activities.account_id
      AND aa.user_id = auth.uid()
      AND aa.role IN ('admin', 'moderator')
      AND aa.is_active = true
    )
  );

CREATE POLICY "Users can delete their own activities" ON contact_activities
  FOR DELETE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM account_access aa
      WHERE aa.account_id = contact_activities.account_id
      AND aa.user_id = auth.uid()
      AND aa.role IN ('admin', 'moderator')
      AND aa.is_active = true
    )
  );

-- Indexes for contact_activities
CREATE INDEX IF NOT EXISTS idx_activities_contact ON contact_activities(contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_account_type ON contact_activities(account_id, activity_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_user ON contact_activities(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activities_tasks_pending ON contact_activities(account_id, task_due_date) 
  WHERE activity_type = 'task' AND NOT task_completed;
CREATE INDEX IF NOT EXISTS idx_activities_external ON contact_activities(external_source, external_id) 
  WHERE external_id IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER update_contact_activities_updated_at BEFORE UPDATE ON contact_activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PART 4: CONTACT CUSTOM FIELDS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS contact_custom_fields (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  
  field_key VARCHAR(100) NOT NULL,
  field_label VARCHAR(255) NOT NULL,
  field_type VARCHAR(50) NOT NULL CHECK (field_type IN (
    'text', 'textarea', 'number', 'date', 'datetime',
    'select', 'multiselect', 'checkbox', 'url', 'email', 'phone'
  )),
  field_options JSONB, -- For select/multiselect: {"options": ["Option 1", "Option 2"]}
  field_section VARCHAR(100) DEFAULT 'custom', -- Group fields: 'contact_info', 'company_info', 'custom'
  
  is_required BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  
  help_text TEXT,
  placeholder VARCHAR(255),
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(account_id, field_key)
);

-- RLS for contact_custom_fields
ALTER TABLE contact_custom_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view custom fields for accessible accounts" ON contact_custom_fields
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM account_access aa
      WHERE aa.account_id = contact_custom_fields.account_id
      AND aa.user_id = auth.uid()
      AND aa.is_active = true
    )
  );

CREATE POLICY "Admins can manage custom fields" ON contact_custom_fields
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM account_access aa
      WHERE aa.account_id = contact_custom_fields.account_id
      AND aa.user_id = auth.uid()
      AND aa.role IN ('admin', 'moderator')
      AND aa.is_active = true
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contact_custom_fields_account ON contact_custom_fields(account_id, display_order) 
  WHERE is_active = TRUE;

-- Trigger for updated_at
CREATE TRIGGER update_contact_custom_fields_updated_at BEFORE UPDATE ON contact_custom_fields
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PART 5: CONTACT SMART VIEWS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS contact_smart_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Filter criteria stored as JSON
  -- Example: [{"field": "lead_status", "operator": "equals", "value": "new"}]
  filters JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Display settings
  visible_columns TEXT[] DEFAULT ARRAY['name', 'email', 'phone', 'lead_status', 'assigned_user_id', 'last_contacted_at'],
  sort_by VARCHAR(100) DEFAULT 'updated_at',
  sort_direction VARCHAR(4) DEFAULT 'DESC' CHECK (sort_direction IN ('ASC', 'DESC')),
  
  -- Sharing
  is_shared BOOLEAN DEFAULT FALSE, -- Visible to whole team
  is_default BOOLEAN DEFAULT FALSE, -- Default view for account
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS for contact_smart_views
ALTER TABLE contact_smart_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own and shared smart views" ON contact_smart_views
  FOR SELECT USING (
    created_by = auth.uid() OR
    (is_shared = TRUE AND EXISTS (
      SELECT 1 FROM account_access aa
      WHERE aa.account_id = contact_smart_views.account_id
      AND aa.user_id = auth.uid()
      AND aa.is_active = true
    ))
  );

CREATE POLICY "Users can create smart views for accessible accounts" ON contact_smart_views
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM account_access aa
      WHERE aa.account_id = contact_smart_views.account_id
      AND aa.user_id = auth.uid()
      AND aa.is_active = true
    )
  );

CREATE POLICY "Users can update their own smart views" ON contact_smart_views
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM account_access aa
      WHERE aa.account_id = contact_smart_views.account_id
      AND aa.user_id = auth.uid()
      AND aa.role IN ('admin', 'moderator')
      AND aa.is_active = true
    )
  );

CREATE POLICY "Users can delete their own smart views" ON contact_smart_views
  FOR DELETE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM account_access aa
      WHERE aa.account_id = contact_smart_views.account_id
      AND aa.user_id = auth.uid()
      AND aa.role IN ('admin', 'moderator')
      AND aa.is_active = true
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_smart_views_account ON contact_smart_views(account_id, is_shared);
CREATE INDEX IF NOT EXISTS idx_smart_views_user ON contact_smart_views(created_by);

-- Trigger for updated_at
CREATE TRIGGER update_contact_smart_views_updated_at BEFORE UPDATE ON contact_smart_views
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default smart views for all existing accounts
INSERT INTO contact_smart_views (account_id, name, description, filters, is_shared, is_default)
SELECT 
  id, 
  'All Contacts', 
  'All contacts in the system',
  '[]'::jsonb,
  TRUE,
  TRUE
FROM accounts
ON CONFLICT DO NOTHING;

INSERT INTO contact_smart_views (account_id, name, description, filters, is_shared)
SELECT 
  id, 
  'New Leads', 
  'Contacts with "New" status',
  '[{"field": "lead_status", "operator": "equals", "value": "new"}]'::jsonb,
  TRUE
FROM accounts
ON CONFLICT DO NOTHING;

INSERT INTO contact_smart_views (account_id, name, description, filters, is_shared)
SELECT 
  id, 
  'Unassigned', 
  'Contacts not assigned to anyone',
  '[{"field": "assigned_user_id", "operator": "is_empty", "value": null}]'::jsonb,
  TRUE
FROM accounts
ON CONFLICT DO NOTHING;

-- ============================================
-- PART 6: HELPER FUNCTIONS
-- ============================================

-- Function to update contact's last_contacted_at when activity is created
CREATE OR REPLACE FUNCTION update_contact_last_contacted()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.activity_type IN ('call', 'email', 'sms', 'meeting') THEN
    UPDATE contacts 
    SET 
      last_contacted_at = NEW.created_at,
      contact_count = contact_count + 1
    WHERE id = NEW.contact_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_contact_last_contacted
  AFTER INSERT ON contact_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_last_contacted();

-- Function to log status changes as activities
CREATE OR REPLACE FUNCTION log_contact_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.lead_status IS DISTINCT FROM NEW.lead_status THEN
    INSERT INTO contact_activities (
      account_id,
      contact_id,
      user_id,
      activity_type,
      activity_direction,
      subject,
      change_field,
      change_old_value,
      change_new_value
    ) VALUES (
      NEW.account_id,
      NEW.id,
      auth.uid(),
      'status_change',
      'internal',
      'Lead status changed',
      'lead_status',
      OLD.lead_status,
      NEW.lead_status
    );
    
    NEW.lead_status_updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_contact_status_change
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  WHEN (OLD.lead_status IS DISTINCT FROM NEW.lead_status)
  EXECUTE FUNCTION log_contact_status_change();

-- ============================================
-- DONE!
-- ============================================
