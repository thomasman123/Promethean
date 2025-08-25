-- Fix dial-appointment linking for existing data
-- This addresses the issue where booked calls show 0 due to missing dial.booked=true links

-- Create function to link appointments to dials retroactively
CREATE OR REPLACE FUNCTION link_appointments_to_dials(
    p_account_id UUID DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
) RETURNS TABLE (
    appointment_id UUID,
    dial_id UUID,
    action TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH appointment_dial_matches AS (
        SELECT DISTINCT ON (a.id)
            a.id as appointment_id,
            d.id as dial_id,
            a.date_booked,
            d.date_called,
            'linked' as action
        FROM appointments a
        JOIN dials d ON d.account_id = a.account_id
            AND d.contact_id = a.contact_id
            AND d.booked = false  -- Only unbooked dials
            AND d.date_called >= (a.date_booked - INTERVAL '60 minutes')
            AND d.date_called <= a.date_booked
        WHERE a.contact_id IS NOT NULL
            AND (p_account_id IS NULL OR a.account_id = p_account_id)
            AND (p_start_date IS NULL OR a.date_booked::date >= p_start_date)
            AND (p_end_date IS NULL OR a.date_booked::date <= p_end_date)
        ORDER BY a.id, d.date_called DESC  -- Most recent dial for each appointment
    )
    UPDATE dials 
    SET booked = true, 
        booked_appointment_id = appointment_dial_matches.appointment_id
    FROM appointment_dial_matches
    WHERE dials.id = appointment_dial_matches.dial_id
    RETURNING appointment_dial_matches.appointment_id, 
              appointment_dial_matches.dial_id, 
              appointment_dial_matches.action;
END;
$$ LANGUAGE plpgsql;

-- Run the backfill for August 21-25, 2024 to fix the immediate issue
DO $$
DECLARE
    result_count INTEGER;
BEGIN
    RAISE NOTICE 'Starting dial-appointment linking backfill for August 21-25, 2024...';
    
    SELECT COUNT(*) INTO result_count
    FROM link_appointments_to_dials(NULL, '2024-08-21'::date, '2024-08-25'::date);
    
    RAISE NOTICE 'Linked % appointments to dials for August 21-25, 2024', result_count;
END $$;

-- Run backfill for all data to ensure consistency
DO $$
DECLARE
    result_count INTEGER;
BEGIN
    RAISE NOTICE 'Starting comprehensive dial-appointment linking backfill...';
    
    SELECT COUNT(*) INTO result_count
    FROM link_appointments_to_dials();
    
    RAISE NOTICE 'Total appointments linked to dials: %', result_count;
END $$;

-- Add comment to function
COMMENT ON FUNCTION link_appointments_to_dials(UUID, DATE, DATE) IS 'Links appointments to their originating dials by finding the most recent dial with same contact within 60 minutes before appointment booking time. Used to fix missing dial.booked=true links.'; 