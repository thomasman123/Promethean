-- Fix the update_activity_counts_trigger function to avoid accessing sales_rep_user_id on dials table
-- The issue is that PostgreSQL tries to validate field access even in conditional branches

-- Drop the existing function first to avoid conflicts
DROP FUNCTION IF EXISTS update_activity_counts_trigger();

CREATE FUNCTION update_activity_counts_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Update setter activity count for both INSERT and UPDATE
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.setter_user_id IS NOT NULL THEN
      UPDATE profiles SET 
        setter_activity_count = (
          SELECT COUNT(*) FROM appointments WHERE setter_user_id = NEW.setter_user_id
        ) + (
          SELECT COUNT(*) FROM dials WHERE setter_user_id = NEW.setter_user_id
        ),
        total_activity_count = setter_activity_count + sales_rep_activity_count
      WHERE id = NEW.setter_user_id;
    END IF;
  END IF;
  
  -- Handle deletes and updates of old values
  IF TG_OP IN ('DELETE', 'UPDATE') THEN
    IF OLD.setter_user_id IS NOT NULL THEN
      UPDATE profiles SET 
        setter_activity_count = (
          SELECT COUNT(*) FROM appointments WHERE setter_user_id = OLD.setter_user_id
        ) + (
          SELECT COUNT(*) FROM dials WHERE setter_user_id = OLD.setter_user_id
        ),
        total_activity_count = setter_activity_count + sales_rep_activity_count
      WHERE id = OLD.setter_user_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create separate trigger function for appointments that handles sales_rep_user_id
-- Drop existing function first
DROP FUNCTION IF EXISTS update_appointments_activity_counts_trigger();

CREATE FUNCTION update_appointments_activity_counts_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Update sales rep activity count for appointments only
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.sales_rep_user_id IS NOT NULL THEN
      UPDATE profiles SET 
        sales_rep_activity_count = (
          SELECT COUNT(*) FROM appointments WHERE sales_rep_user_id = NEW.sales_rep_user_id
        ),
        total_activity_count = setter_activity_count + sales_rep_activity_count
      WHERE id = NEW.sales_rep_user_id;
    END IF;
  END IF;
  
  IF TG_OP IN ('DELETE', 'UPDATE') THEN
    IF OLD.sales_rep_user_id IS NOT NULL THEN
      UPDATE profiles SET 
        sales_rep_activity_count = (
          SELECT COUNT(*) FROM appointments WHERE sales_rep_user_id = OLD.sales_rep_user_id
        ),
        total_activity_count = setter_activity_count + sales_rep_activity_count
      WHERE id = OLD.sales_rep_user_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop the old appointments trigger and recreate it with the new function
DROP TRIGGER IF EXISTS appointments_activity_count_trigger ON appointments;
CREATE TRIGGER appointments_activity_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_appointments_activity_counts_trigger(); 