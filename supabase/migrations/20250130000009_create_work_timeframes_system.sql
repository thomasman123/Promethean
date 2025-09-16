-- Create work timeframes system for tracking daily work hours by user timezone
-- This tracks the time from first dial to last dial made each day per user

-- Work Timeframes table
CREATE TABLE IF NOT EXISTS work_timeframes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    work_date DATE NOT NULL, -- Local date in user's timezone
    timezone TEXT NOT NULL, -- User's timezone (e.g., 'America/New_York')
    
    -- Work period tracking
    first_dial_at TIMESTAMPTZ, -- UTC timestamp of first dial
    last_dial_at TIMESTAMPTZ, -- UTC timestamp of last dial
    first_dial_local_time TIME, -- Local time of first dial
    last_dial_local_time TIME, -- Local time of last dial
    
    -- Calculated work metrics
    total_work_hours DECIMAL(10,2) DEFAULT 0, -- Hours between first and last dial
    total_dials INTEGER DEFAULT 0, -- Total dials made this day
    total_bookings INTEGER DEFAULT 0, -- Total bookings made this day (booked=true)
    
    -- Performance metrics
    bookings_per_hour DECIMAL(10,2) DEFAULT 0, -- Bookings / work hours
    dials_per_hour DECIMAL(10,2) DEFAULT 0, -- Dials / work hours
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicates
    UNIQUE(account_id, user_id, work_date, timezone)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_work_timeframes_account_id ON work_timeframes(account_id);
CREATE INDEX IF NOT EXISTS idx_work_timeframes_user_id ON work_timeframes(user_id);
CREATE INDEX IF NOT EXISTS idx_work_timeframes_work_date ON work_timeframes(work_date);
CREATE INDEX IF NOT EXISTS idx_work_timeframes_account_user_date ON work_timeframes(account_id, user_id, work_date);

-- Function to calculate and update work timeframes for a user and date
CREATE OR REPLACE FUNCTION calculate_work_timeframe(
    p_account_id UUID,
    p_user_id UUID,
    p_work_date DATE,
    p_timezone TEXT DEFAULT 'UTC'
)
RETURNS work_timeframes
LANGUAGE plpgsql
AS $$
DECLARE
    result_record work_timeframes;
    first_dial_utc TIMESTAMPTZ;
    last_dial_utc TIMESTAMPTZ;
    first_dial_local TIME;
    last_dial_local TIME;
    work_hours DECIMAL(10,2);
    dial_count INTEGER;
    booking_count INTEGER;
    bookings_per_hr DECIMAL(10,2);
    dials_per_hr DECIMAL(10,2);
BEGIN
    -- Get first and last dial times for the user on this date (in their timezone)
    SELECT 
        MIN(created_at) as first_dial,
        MAX(created_at) as last_dial,
        COUNT(*) as total_dials,
        COUNT(*) FILTER (WHERE booked = true) as total_bookings
    INTO first_dial_utc, last_dial_utc, dial_count, booking_count
    FROM dials
    WHERE account_id = p_account_id 
      AND setter_user_id = p_user_id
      AND DATE(created_at AT TIME ZONE p_timezone) = p_work_date;
    
    -- If no dials found, return null
    IF first_dial_utc IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Convert to local times
    first_dial_local := (first_dial_utc AT TIME ZONE p_timezone)::TIME;
    last_dial_local := (last_dial_utc AT TIME ZONE p_timezone)::TIME;
    
    -- Calculate work hours (minimum 0.1 hours to avoid division by zero)
    work_hours := GREATEST(
        EXTRACT(EPOCH FROM (last_dial_utc - first_dial_utc)) / 3600.0,
        0.1
    );
    
    -- Calculate per-hour metrics
    bookings_per_hr := booking_count / work_hours;
    dials_per_hr := dial_count / work_hours;
    
    -- Insert or update the work timeframe record
    INSERT INTO work_timeframes (
        account_id, user_id, work_date, timezone,
        first_dial_at, last_dial_at, first_dial_local_time, last_dial_local_time,
        total_work_hours, total_dials, total_bookings,
        bookings_per_hour, dials_per_hour
    ) VALUES (
        p_account_id, p_user_id, p_work_date, p_timezone,
        first_dial_utc, last_dial_utc, first_dial_local, last_dial_local,
        work_hours, dial_count, booking_count,
        bookings_per_hr, dials_per_hr
    )
    ON CONFLICT (account_id, user_id, work_date, timezone)
    DO UPDATE SET
        first_dial_at = EXCLUDED.first_dial_at,
        last_dial_at = EXCLUDED.last_dial_at,
        first_dial_local_time = EXCLUDED.first_dial_local_time,
        last_dial_local_time = EXCLUDED.last_dial_local_time,
        total_work_hours = EXCLUDED.total_work_hours,
        total_dials = EXCLUDED.total_dials,
        total_bookings = EXCLUDED.total_bookings,
        bookings_per_hour = EXCLUDED.bookings_per_hour,
        dials_per_hour = EXCLUDED.dials_per_hour,
        updated_at = NOW()
    RETURNING * INTO result_record;
    
    RETURN result_record;
END;
$$;

-- Function to bulk calculate work timeframes for an account and date range
CREATE OR REPLACE FUNCTION bulk_calculate_work_timeframes(
    p_account_id UUID,
    p_start_date DATE,
    p_end_date DATE,
    p_timezone TEXT DEFAULT 'UTC'
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    user_record RECORD;
    date_record RECORD;
    processed_count INTEGER := 0;
BEGIN
    -- Loop through each user in the account
    FOR user_record IN 
        SELECT DISTINCT setter_user_id as user_id
        FROM dials 
        WHERE account_id = p_account_id 
          AND setter_user_id IS NOT NULL
          AND DATE(created_at AT TIME ZONE p_timezone) BETWEEN p_start_date AND p_end_date
    LOOP
        -- Loop through each date in the range
        FOR date_record IN 
            SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::DATE as work_date
        LOOP
            -- Calculate work timeframe for this user and date
            PERFORM calculate_work_timeframe(
                p_account_id, 
                user_record.user_id, 
                date_record.work_date, 
                p_timezone
            );
            processed_count := processed_count + 1;
        END LOOP;
    END LOOP;
    
    RETURN processed_count;
END;
$$;

-- RLS Policies
ALTER TABLE work_timeframes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view work timeframes for their accessible accounts" ON work_timeframes
    FOR SELECT USING (
        account_id IN (
            SELECT account_id FROM account_access 
            WHERE user_id = auth.uid() 
            AND (role = 'admin' OR role = 'moderator' OR role = 'sales_rep' OR role = 'setter')
        )
    );

CREATE POLICY "Admins can manage work timeframes" ON work_timeframes
    FOR ALL USING (
        account_id IN (
            SELECT account_id FROM account_access 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Grant permissions
GRANT ALL ON work_timeframes TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_work_timeframe(UUID, UUID, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_calculate_work_timeframes(UUID, DATE, DATE, TEXT) TO authenticated; 