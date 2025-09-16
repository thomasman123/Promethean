-- Add meaningful conversations tracking to dials table
-- A meaningful conversation is defined as a dial with duration >= 120 seconds

-- Add meaningful_conversation column to dials table
ALTER TABLE dials ADD COLUMN IF NOT EXISTS meaningful_conversation BOOLEAN DEFAULT false;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_dials_meaningful_conversation ON dials(meaningful_conversation);
CREATE INDEX IF NOT EXISTS idx_dials_account_meaningful ON dials(account_id, meaningful_conversation);

-- Function to update meaningful conversations based on call duration
CREATE OR REPLACE FUNCTION update_meaningful_conversations(
    p_account_id UUID DEFAULT NULL,
    p_min_duration_seconds INTEGER DEFAULT 120
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    updated_count INTEGER := 0;
BEGIN
    -- Update meaningful_conversation flag based on call duration
    UPDATE dials 
    SET meaningful_conversation = (
        CASE 
            WHEN call_duration_seconds >= p_min_duration_seconds THEN true
            ELSE false
        END
    ),
    updated_at = NOW()
    WHERE (p_account_id IS NULL OR account_id = p_account_id)
      AND call_duration_seconds IS NOT NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RETURN updated_count;
END;
$$;

-- Function to update meaningful conversations for new/updated dials (trigger function)
CREATE OR REPLACE FUNCTION update_meaningful_conversation_on_dial()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Set meaningful_conversation based on call duration
    IF NEW.call_duration_seconds IS NOT NULL THEN
        NEW.meaningful_conversation := (NEW.call_duration_seconds >= 120);
    ELSE
        NEW.meaningful_conversation := false;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger to automatically update meaningful_conversation on insert/update
DROP TRIGGER IF EXISTS trigger_update_meaningful_conversation ON dials;
CREATE TRIGGER trigger_update_meaningful_conversation
    BEFORE INSERT OR UPDATE OF call_duration_seconds
    ON dials
    FOR EACH ROW
    EXECUTE FUNCTION update_meaningful_conversation_on_dial();

-- Backfill existing data (update all existing dials)
SELECT update_meaningful_conversations() as backfilled_count;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_meaningful_conversations(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION update_meaningful_conversation_on_dial() TO authenticated;

-- Add comment
COMMENT ON COLUMN dials.meaningful_conversation IS 'True if call duration >= 120 seconds, indicating a meaningful conversation';
COMMENT ON FUNCTION update_meaningful_conversations IS 'Updates meaningful_conversation flag for existing dials based on call duration';
COMMENT ON FUNCTION update_meaningful_conversation_on_dial IS 'Trigger function to automatically set meaningful_conversation on dial insert/update'; 