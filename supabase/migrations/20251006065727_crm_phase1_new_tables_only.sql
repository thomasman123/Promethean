-- ============================================
-- CRM PHASE 1: NEW TABLES ONLY
-- ============================================
-- SAFE: Only creates NEW tables, doesn't modify existing ones
-- Can be applied to production without breaking current functionality
-- ============================================

-- ============================================
-- PART 1: CREATE ENUMS
-- ============================================

-- Activity types for CRM timeline
DO $$ BEGIN
  CREATE TYPE crm_activity_type AS ENUM (
    'note',
    'email', 
    'call',
    'sms',
    'meeting',
    'task',
    'status_change',
    'field_change'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Activity direction
DO $$ BEGIN
  CREATE TYPE crm_activity_direction AS ENUM ('inbound', 'outbound', 'internal');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- PART 2: CRM LEAD STATUSES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS crm_lead_statuses (
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

-- RLS
ALTER TABLE crm_lead_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view lead statuses for accessible accounts" ON crm_lead_statuses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM account_access aa
      WHERE aa.account_id = crm_lead_statuses.account_id
      AND aa.user_id = auth.uid()
      AND aa.is_active = true
    )
  );

CREATE POLICY "Admins can manage lead statuses" ON crm_lead_statuses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM account_access aa
      WHERE aa.account_id = crm_lead_statuses.account_id
      AND aa.user_id = auth.uid()
      AND aa.role IN ('admin', 'moderator')
      AND aa.is_active = true
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crm_lead_statuses_account ON crm_lead_statuses(account_id, display_order) WHERE is_active = TRUE;

-- Trigger
CREATE TRIGGER update_crm_lead_statuses_updated_at BEFORE UPDATE ON crm_lead_statuses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PART 3: CRM CONTACT ACTIVITIES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS crm_contact_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  activity_type crm_activity_type NOT NULL,
  activity_direction crm_activity_direction,
  
  -- Common fields
  subject VARCHAR(500),
  body TEXT,
  
  -- Email specific
  email_message_id VARCHAR(255),
  email_from VARCHAR(255),
  email_to TEXT[],
  email_cc TEXT[],
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
  
  -- Change tracking
  change_field VARCHAR(100),
  change_old_value TEXT,
  change_new_value TEXT,
  
  -- Metadata
  metadata JSONB,
  external_id VARCHAR(255),
  external_source VARCHAR(50),
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS
ALTER TABLE crm_contact_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activities for accessible contacts" ON crm_contact_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM account_access aa
      WHERE aa.account_id = crm_contact_activities.account_id
      AND aa.user_id = auth.uid()
      AND aa.is_active = true
    )
  );

CREATE POLICY "Users can create activities" ON crm_contact_activities
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM account_access aa
      WHERE aa.account_id = crm_contact_activities.account_id
      AND aa.user_id = auth.uid()
      AND aa.is_active = true
    )
  );

CREATE POLICY "Users can update their own activities" ON crm_contact_activities
  FOR UPDATE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM account_access aa
      WHERE aa.account_id = crm_contact_activities.account_id
      AND aa.user_id = auth.uid()
      AND aa.role IN ('admin', 'moderator')
      AND aa.is_active = true
    )
  );

CREATE POLICY "Users can delete their own activities" ON crm_contact_activities
  FOR DELETE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM account_access aa
      WHERE aa.account_id = crm_contact_activities.account_id
      AND aa.user_id = auth.uid()
      AND aa.role IN ('admin', 'moderator')
      AND aa.is_active = true
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crm_activities_contact ON crm_contact_activities(contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_activities_account_type ON crm_contact_activities(account_id, activity_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_activities_user ON crm_contact_activities(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_activities_tasks ON crm_contact_activities(account_id, task_due_date) 
  WHERE activity_type = 'task' AND NOT task_completed;

-- Trigger
CREATE TRIGGER update_crm_contact_activities_updated_at BEFORE UPDATE ON crm_contact_activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PART 4: CRM CUSTOM FIELDS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS crm_contact_custom_fields (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  
  field_key VARCHAR(100) NOT NULL,
  field_label VARCHAR(255) NOT NULL,
  field_type VARCHAR(50) NOT NULL CHECK (field_type IN (
    'text', 'textarea', 'number', 'date', 'datetime',
    'select', 'multiselect', 'checkbox', 'url', 'email', 'phone'
  )),
  field_options JSONB,
  field_section VARCHAR(100) DEFAULT 'custom',
  
  is_required BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  
  help_text TEXT,
  placeholder VARCHAR(255),
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(account_id, field_key)
);

-- RLS
ALTER TABLE crm_contact_custom_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view custom fields" ON crm_contact_custom_fields
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM account_access aa
      WHERE aa.account_id = crm_contact_custom_fields.account_id
      AND aa.user_id = auth.uid()
      AND aa.is_active = true
    )
  );

CREATE POLICY "Admins can manage custom fields" ON crm_contact_custom_fields
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM account_access aa
      WHERE aa.account_id = crm_contact_custom_fields.account_id
      AND aa.user_id = auth.uid()
      AND aa.role IN ('admin', 'moderator')
      AND aa.is_active = true
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crm_custom_fields_account ON crm_contact_custom_fields(account_id, display_order) 
  WHERE is_active = TRUE;

-- Trigger
CREATE TRIGGER update_crm_contact_custom_fields_updated_at BEFORE UPDATE ON crm_contact_custom_fields
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PART 5: CRM SMART VIEWS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS crm_contact_smart_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  filters JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  visible_columns TEXT[] DEFAULT ARRAY['name', 'email', 'phone', 'created_at'],
  sort_by VARCHAR(100) DEFAULT 'updated_at',
  sort_direction VARCHAR(4) DEFAULT 'DESC' CHECK (sort_direction IN ('ASC', 'DESC')),
  
  is_shared BOOLEAN DEFAULT FALSE,
  is_default BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS
ALTER TABLE crm_contact_smart_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own and shared views" ON crm_contact_smart_views
  FOR SELECT USING (
    created_by = auth.uid() OR
    (is_shared = TRUE AND EXISTS (
      SELECT 1 FROM account_access aa
      WHERE aa.account_id = crm_contact_smart_views.account_id
      AND aa.user_id = auth.uid()
      AND aa.is_active = true
    ))
  );

CREATE POLICY "Users can create views" ON crm_contact_smart_views
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM account_access aa
      WHERE aa.account_id = crm_contact_smart_views.account_id
      AND aa.user_id = auth.uid()
      AND aa.is_active = true
    )
  );

CREATE POLICY "Users can update their own views" ON crm_contact_smart_views
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM account_access aa
      WHERE aa.account_id = crm_contact_smart_views.account_id
      AND aa.user_id = auth.uid()
      AND aa.role IN ('admin', 'moderator')
      AND aa.is_active = true
    )
  );

CREATE POLICY "Users can delete their own views" ON crm_contact_smart_views
  FOR DELETE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM account_access aa
      WHERE aa.account_id = crm_contact_smart_views.account_id
      AND aa.user_id = auth.uid()
      AND aa.role IN ('admin', 'moderator')
      AND aa.is_active = true
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crm_smart_views_account ON crm_contact_smart_views(account_id, is_shared);
CREATE INDEX IF NOT EXISTS idx_crm_smart_views_user ON crm_contact_smart_views(created_by);

-- Trigger
CREATE TRIGGER update_crm_contact_smart_views_updated_at BEFORE UPDATE ON crm_contact_smart_views
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PART 6: INSERT DEFAULT DATA
-- ============================================

-- Insert default lead statuses for all existing accounts
INSERT INTO crm_lead_statuses (account_id, name, color, display_order, is_default)
SELECT 
  id, 
  'New', 
  '#3B82F6', 
  1, 
  TRUE
FROM accounts
ON CONFLICT (account_id, name) DO NOTHING;

INSERT INTO crm_lead_statuses (account_id, name, color, display_order)
SELECT id, 'Contacted', '#8B5CF6', 2 FROM accounts
ON CONFLICT (account_id, name) DO NOTHING;

INSERT INTO crm_lead_statuses (account_id, name, color, display_order)
SELECT id, 'Qualified', '#10B981', 3 FROM accounts
ON CONFLICT (account_id, name) DO NOTHING;

INSERT INTO crm_lead_statuses (account_id, name, color, display_order)
SELECT id, 'Unqualified', '#EF4444', 4 FROM accounts
ON CONFLICT (account_id, name) DO NOTHING;

-- Insert default smart views
INSERT INTO crm_contact_smart_views (account_id, name, description, filters, is_shared, is_default)
SELECT 
  id, 
  'All Contacts', 
  'All contacts in the system',
  '[]'::jsonb,
  TRUE,
  TRUE
FROM accounts
ON CONFLICT DO NOTHING;

-- ============================================
-- DONE!
-- ============================================
-- These new CRM tables are ready to use
-- Existing tables (contacts, appointments, etc.) are untouched
-- ============================================
