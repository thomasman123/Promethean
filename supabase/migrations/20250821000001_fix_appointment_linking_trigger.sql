-- Fix appointment↔discovery linking trigger to use contact_id instead of dropped contact fields

-- 1) Drop old trigger and function if they exist
DROP TRIGGER IF EXISTS trigger_link_discovery_to_appointment ON appointments;
DROP FUNCTION IF EXISTS link_discovery_to_appointment();

-- 2) Create new function using contact_id and a 60-minute window before booking time
CREATE OR REPLACE FUNCTION link_discovery_to_appointment_v2()
RETURNS TRIGGER AS $$
DECLARE
    v_discovery_id UUID;
BEGIN
    -- Only process for appointments table inserts
    IF TG_TABLE_NAME = 'appointments' THEN
        -- Require contact_id and date_booked to be present
        IF NEW.contact_id IS NULL OR NEW.date_booked IS NULL THEN
            RETURN NEW;
        END IF;

        -- Find the most recent discovery for the same contact within 60 minutes before booking
        SELECT d.id
        INTO v_discovery_id
        FROM discoveries d
        WHERE d.account_id = NEW.account_id
          AND d.contact_id = NEW.contact_id
          AND d.linked_appointment_id IS NULL
          AND d.date_booked_for >= (NEW.date_booked - INTERVAL '60 minutes')
          AND d.date_booked_for <= NEW.date_booked
        ORDER BY d.date_booked_for DESC
        LIMIT 1;

        IF v_discovery_id IS NOT NULL THEN
            -- Link both sides
            UPDATE appointments
            SET linked_discovery_id = v_discovery_id
            WHERE id = NEW.id;

            UPDATE discoveries
            SET linked_appointment_id = NEW.id,
                show_outcome = COALESCE(show_outcome, 'booked')
            WHERE id = v_discovery_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3) Recreate trigger
CREATE TRIGGER trigger_link_discovery_to_appointment
    AFTER INSERT ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION link_discovery_to_appointment_v2();

-- 4) Documentation
COMMENT ON FUNCTION link_discovery_to_appointment_v2() IS 'Links a discovery to a new appointment using contact_id within 60 minutes prior to booking; replaces legacy contact_name/email/phone logic.'; 