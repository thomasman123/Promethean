-- Create follow_ups table to track follow-up chains
CREATE TABLE IF NOT EXISTS follow_ups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    parent_follow_up_id UUID REFERENCES follow_ups(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    
    -- Follow-up scheduling
    scheduled_for TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    
    -- Assignment
    assigned_to_user_id UUID REFERENCES profiles(id),
    assigned_to_name VARCHAR(255),
    assigned_to_ghl_id TEXT,
    
    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'overdue')),
    
    -- Outcomes when completed
    call_outcome VARCHAR(50) CHECK (call_outcome IN ('Show', 'No Show', 'Reschedule', 'Cancel')),
    show_outcome VARCHAR(50) CHECK (show_outcome IN ('won', 'lost', 'follow up')),
    
    -- Business metrics
    pitched BOOLEAN DEFAULT false,
    watched_assets BOOLEAN DEFAULT false,
    cash_collected NUMERIC DEFAULT 0,
    total_sales_value NUMERIC DEFAULT 0,
    lead_quality INTEGER CHECK (lead_quality >= 1 AND lead_quality <= 5),
    objections JSONB DEFAULT '{}',
    
    -- Notes and metadata
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create partial unique index to ensure only one pending follow-up per appointment
CREATE UNIQUE INDEX idx_unique_pending_follow_up_per_appointment 
ON follow_ups(appointment_id) 
WHERE status = 'pending';

-- Create follow_up_notifications table for reminder system
CREATE TABLE IF NOT EXISTS follow_up_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follow_up_id UUID NOT NULL REFERENCES follow_ups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    
    -- Notification details
    notification_type VARCHAR(50) NOT NULL DEFAULT 'reminder' CHECK (notification_type IN ('reminder', 'overdue', 'completed', 'cancelled')),
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    
    -- Delivery details
    delivery_method VARCHAR(50) DEFAULT 'in_app' CHECK (delivery_method IN ('in_app', 'email', 'sms', 'push')),
    delivery_status VARCHAR(50) DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'failed', 'acknowledged')),
    
    -- Content
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add relationship columns to appointments table if not exists
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS has_follow_ups BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS latest_follow_up_id UUID REFERENCES follow_ups(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS follow_up_count INTEGER DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_follow_ups_appointment_id ON follow_ups(appointment_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON follow_ups(status);
CREATE INDEX IF NOT EXISTS idx_follow_ups_scheduled_for ON follow_ups(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_follow_ups_assigned_to ON follow_ups(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_notifications_user_id ON follow_up_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_notifications_scheduled_for ON follow_up_notifications(scheduled_for);

-- Enable RLS
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for follow_ups
CREATE POLICY "follow_ups_select_policy" ON follow_ups
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM account_access 
            WHERE account_access.account_id = follow_ups.account_id 
            AND account_access.user_id = auth.uid() 
            AND account_access.is_active = true
        )
    );

CREATE POLICY "follow_ups_insert_policy" ON follow_ups
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM account_access 
            WHERE account_access.account_id = follow_ups.account_id 
            AND account_access.user_id = auth.uid() 
            AND account_access.is_active = true
        )
    );

CREATE POLICY "follow_ups_update_policy" ON follow_ups
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM account_access 
            WHERE account_access.account_id = follow_ups.account_id 
            AND account_access.user_id = auth.uid() 
            AND account_access.is_active = true
        )
    );

CREATE POLICY "follow_ups_delete_policy" ON follow_ups
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM account_access 
            WHERE account_access.account_id = follow_ups.account_id 
            AND account_access.user_id = auth.uid() 
            AND account_access.is_active = true
            AND account_access.role IN ('admin', 'moderator')
        )
    );

-- RLS Policies for follow_up_notifications
CREATE POLICY "notifications_select_policy" ON follow_up_notifications
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM account_access 
            WHERE account_access.account_id = follow_up_notifications.account_id 
            AND account_access.user_id = auth.uid() 
            AND account_access.is_active = true
            AND account_access.role IN ('admin', 'moderator')
        )
    );

CREATE POLICY "notifications_insert_policy" ON follow_up_notifications
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM account_access 
            WHERE account_access.account_id = follow_up_notifications.account_id 
            AND account_access.user_id = auth.uid() 
            AND account_access.is_active = true
        )
    );

CREATE POLICY "notifications_update_policy" ON follow_up_notifications
    FOR UPDATE USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM account_access 
            WHERE account_access.account_id = follow_up_notifications.account_id 
            AND account_access.user_id = auth.uid() 
            AND account_access.is_active = true
            AND account_access.role IN ('admin', 'moderator')
        )
    );

-- Function to automatically create follow-up when appointment outcome is 'follow up'
CREATE OR REPLACE FUNCTION create_follow_up_from_appointment()
RETURNS TRIGGER AS $$
BEGIN
    -- If show_outcome changed to 'follow up' and follow_up_at is set
    IF NEW.show_outcome = 'follow up' AND NEW.follow_up_at IS NOT NULL AND 
       (OLD.show_outcome IS NULL OR OLD.show_outcome != 'follow up') THEN
        
        -- Create a new follow-up
        INSERT INTO follow_ups (
            appointment_id,
            account_id,
            scheduled_for,
            assigned_to_user_id,
            assigned_to_name,
            assigned_to_ghl_id,
            status
        ) VALUES (
            NEW.id,
            NEW.account_id,
            NEW.follow_up_at,
            NEW.sales_rep_user_id,
            NEW.sales_rep,
            NEW.sales_rep_ghl_id,
            'pending'
        );
        
        -- Update appointment flags
        UPDATE appointments 
        SET has_follow_ups = true,
            follow_up_count = COALESCE(follow_up_count, 0) + 1
        WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic follow-up creation
CREATE TRIGGER trigger_create_follow_up
    AFTER UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION create_follow_up_from_appointment();

-- Function to update appointment when follow-up is completed
CREATE OR REPLACE FUNCTION update_appointment_on_follow_up_complete()
RETURNS TRIGGER AS $$
BEGIN
    -- If follow-up status changed to completed
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Update the latest follow-up reference
        UPDATE appointments
        SET latest_follow_up_id = NEW.id,
            updated_at = NOW()
        WHERE id = NEW.appointment_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for follow-up completion
CREATE TRIGGER trigger_follow_up_completion
    AFTER UPDATE ON follow_ups
    FOR EACH ROW
    EXECUTE FUNCTION update_appointment_on_follow_up_complete();

-- Function to mark follow-ups as overdue
CREATE OR REPLACE FUNCTION mark_overdue_follow_ups()
RETURNS void AS $$
BEGIN
    UPDATE follow_ups
    SET status = 'overdue',
        updated_at = NOW()
    WHERE status = 'pending'
    AND scheduled_for < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a view for follow-up dashboard
CREATE OR REPLACE VIEW follow_up_dashboard AS
SELECT 
    f.id,
    f.appointment_id,
    f.scheduled_for,
    f.status,
    f.assigned_to_name,
    f.assigned_to_user_id,
    f.created_at,
    f.completed_at,
    f.call_outcome,
    f.show_outcome,
    f.notes,
    a.id as original_appointment_id,
    a.date_booked_for as original_appointment_date,
    a.setter as original_setter,
    a.sales_rep as original_sales_rep,
    a.show_outcome as original_show_outcome,
    c.name as contact_name,
    c.email as contact_email,
    c.phone as contact_phone,
    acc.name as account_name,
    COUNT(fn.id) FILTER (WHERE fn.delivery_status = 'pending') as pending_notifications,
    COUNT(fn.id) FILTER (WHERE fn.delivery_status = 'sent') as sent_notifications
FROM follow_ups f
JOIN appointments a ON f.appointment_id = a.id
LEFT JOIN contacts c ON a.contact_id = c.id
JOIN accounts acc ON f.account_id = acc.id
LEFT JOIN follow_up_notifications fn ON f.id = fn.follow_up_id
GROUP BY f.id, a.id, c.id, acc.id;

-- Grant access to the view
GRANT SELECT ON follow_up_dashboard TO authenticated; 