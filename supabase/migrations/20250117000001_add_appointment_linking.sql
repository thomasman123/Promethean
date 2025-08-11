-- Add appointment linking functionality
-- This migration supports the discoveries → appointments workflow

-- Add metadata columns to both tables
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE discoveries ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add appointment linking to discoveries
ALTER TABLE discoveries ADD COLUMN IF NOT EXISTS linked_appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL;

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_appointments_metadata ON appointments USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_discoveries_metadata ON discoveries USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_discoveries_linked_appointment ON discoveries(linked_appointment_id);

-- Function to automatically link discoveries to appointments
CREATE OR REPLACE FUNCTION link_discovery_to_appointment()
RETURNS TRIGGER AS $$
DECLARE
    discovery_row discoveries%ROWTYPE;
    appointment_sales_rep VARCHAR(255);
BEGIN
    -- Only process appointments table inserts
    IF TG_TABLE_NAME = 'appointments' THEN
        -- Find matching discovery within the last 30 days with same contact details
        SELECT * INTO discovery_row
        FROM discoveries d
        WHERE d.account_id = NEW.account_id
          AND (d.contact_name = NEW.contact_name OR d.phone = NEW.phone OR d.email = NEW.email)
          AND d.linked_appointment_id IS NULL  -- Not already linked
          AND d.show_outcome IS NULL           -- Outcome not yet determined
          AND d.date_booked_for >= (NEW.date_booked_for - INTERVAL '30 days')
        ORDER BY d.date_booked_for DESC
        LIMIT 1;

        -- If we found a matching discovery, link it
        IF discovery_row.id IS NOT NULL THEN
            -- Update discovery with appointment link and set show_outcome to 'booked'
            UPDATE discoveries 
            SET linked_appointment_id = NEW.id,
                show_outcome = 'booked',
                sales_rep = NEW.sales_rep,  -- Set sales rep from appointment
                updated_at = NOW()
            WHERE id = discovery_row.id;

            -- Update appointment setter to use discovery booked_user if available
            UPDATE appointments
            SET setter = discovery_row.setter,  -- Use discovery's booked_user as appointment setter
                updated_at = NOW()
            WHERE id = NEW.id;

            -- Log the linking (if you have a logging table)
            RAISE NOTICE 'Linked discovery % to appointment % for contact %', 
                discovery_row.id, NEW.id, NEW.contact_name;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-link when appointments are created
DROP TRIGGER IF EXISTS trigger_link_discovery_to_appointment ON appointments;
CREATE TRIGGER trigger_link_discovery_to_appointment
    AFTER INSERT ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION link_discovery_to_appointment();

-- Function to manually set discovery outcomes (for discoveries that don't get booked)
CREATE OR REPLACE FUNCTION mark_discovery_not_booked(discovery_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE discoveries 
    SET show_outcome = 'not booked',
        updated_at = NOW()
    WHERE id = discovery_id 
      AND show_outcome IS NULL;  -- Only update if outcome not already set

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- View to see discovery → appointment flow
CREATE OR REPLACE VIEW discovery_appointment_flow AS
SELECT 
    d.id as discovery_id,
    d.contact_name,
    d.phone,
    d.email,
    d.setter as booked_user,  -- Who conducted the discovery
    d.date_booked_for as discovery_date,
    d.show_outcome,
    d.linked_appointment_id,
    a.id as appointment_id,
    a.setter as appointment_setter,  -- Who booked the appointment (often same as booked_user)
    a.sales_rep as appointment_sales_rep,  -- Assigned user from GHL
    a.date_booked_for as appointment_date,
    a.call_outcome as appointment_outcome,
    d.account_id
FROM discoveries d
LEFT JOIN appointments a ON d.linked_appointment_id = a.id
ORDER BY d.date_booked_for DESC;

-- Grant permissions
GRANT SELECT ON discovery_appointment_flow TO authenticated;
GRANT EXECUTE ON FUNCTION mark_discovery_not_booked(UUID) TO authenticated;

-- Comments for documentation
COMMENT ON COLUMN discoveries.setter IS 'The user who conducted the discovery call (booked_user)';
COMMENT ON COLUMN discoveries.sales_rep IS 'Assigned sales rep from linked appointment (populated automatically)';
COMMENT ON COLUMN discoveries.show_outcome IS 'Result of discovery: booked (linked to appointment) or not booked';
COMMENT ON COLUMN discoveries.linked_appointment_id IS 'References the appointment that was booked from this discovery';

COMMENT ON COLUMN appointments.setter IS 'Who booked the appointment (often the discovery booked_user)';
COMMENT ON COLUMN appointments.sales_rep IS 'Assigned user from GHL for this appointment';

COMMENT ON VIEW discovery_appointment_flow IS 'Shows the complete discovery → appointment workflow with all key players';
COMMENT ON FUNCTION link_discovery_to_appointment() IS 'Automatically links discoveries to appointments and updates field semantics';
COMMENT ON FUNCTION mark_discovery_not_booked(UUID) IS 'Manually mark a discovery as not booked when no appointment results'; 