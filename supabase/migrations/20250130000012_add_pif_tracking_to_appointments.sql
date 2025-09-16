-- Add PIF (Payment in Full) tracking to appointments table
-- PIF = true when cash_collected equals total_sales_value

-- Add pif column to appointments table
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS pif BOOLEAN DEFAULT false;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_appointments_pif ON appointments(pif);
CREATE INDEX IF NOT EXISTS idx_appointments_account_pif ON appointments(account_id, pif);

-- Function to update PIF status based on cash_collected and total_sales_value
CREATE OR REPLACE FUNCTION update_pif_status(
    p_account_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    updated_count INTEGER := 0;
BEGIN
    -- Update PIF flag where cash_collected equals total_sales_value
    UPDATE appointments 
    SET pif = (
        CASE 
            WHEN cash_collected IS NOT NULL 
                 AND total_sales_value IS NOT NULL 
                 AND cash_collected = total_sales_value 
                 AND cash_collected > 0
            THEN true
            ELSE false
        END
    ),
    updated_at = NOW()
    WHERE (p_account_id IS NULL OR account_id = p_account_id)
      AND (cash_collected IS NOT NULL OR total_sales_value IS NOT NULL);
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RETURN updated_count;
END;
$$;

-- Function to update PIF status for new/updated appointments (trigger function)
CREATE OR REPLACE FUNCTION update_pif_on_appointment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Set PIF based on cash_collected and total_sales_value
    IF NEW.cash_collected IS NOT NULL AND NEW.total_sales_value IS NOT NULL THEN
        NEW.pif := (NEW.cash_collected = NEW.total_sales_value AND NEW.cash_collected > 0);
    ELSE
        NEW.pif := false;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger to automatically update PIF on insert/update
DROP TRIGGER IF EXISTS trigger_update_pif ON appointments;
CREATE TRIGGER trigger_update_pif
    BEFORE INSERT OR UPDATE OF cash_collected, total_sales_value
    ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_pif_on_appointment();

-- Backfill existing data (update all existing appointments)
SELECT update_pif_status() as backfilled_count;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_pif_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_pif_on_appointment() TO authenticated;

-- Add comment
COMMENT ON COLUMN appointments.pif IS 'True if cash_collected equals total_sales_value (Payment in Full)';
COMMENT ON FUNCTION update_pif_status IS 'Updates PIF flag for existing appointments based on cash_collected = total_sales_value';
COMMENT ON FUNCTION update_pif_on_appointment IS 'Trigger function to automatically set PIF on appointment insert/update'; 