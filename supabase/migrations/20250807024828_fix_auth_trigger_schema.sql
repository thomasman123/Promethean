-- Drop the existing trigger and function to recreate them properly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Recreate the function with proper schema qualification and error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert into profiles with explicit schema
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    
    -- Grant access to the first account (with error handling)
    BEGIN
        PERFORM public.grant_account_access(
            NEW.id, 
            '01234567-0123-4567-8901-000000000001'::UUID, 
            'setter'::user_role
        );
    EXCEPTION 
        WHEN OTHERS THEN
            -- Log error but don't fail the user creation
            RAISE WARNING 'Failed to grant default account access for user %: %', NEW.id, SQLERRM;
    END;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error details
        RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
        -- Re-raise the error to fail the signup if profile creation fails
        RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also ensure the grant_account_access function is in public schema
CREATE OR REPLACE FUNCTION public.grant_account_access(
  user_id UUID,
  account_id UUID,
  role user_role DEFAULT 'setter',
  granted_by_user_id UUID DEFAULT NULL
)
RETURNS public.account_access AS $$
DECLARE
  access_record public.account_access;
BEGIN
  INSERT INTO public.account_access (user_id, account_id, role, granted_by)
  VALUES (user_id, account_id, role, granted_by_user_id)
  ON CONFLICT (user_id, account_id) 
  DO UPDATE SET 
    role = EXCLUDED.role,
    granted_by = EXCLUDED.granted_by,
    granted_at = NOW(),
    is_active = true
  RETURNING * INTO access_record;
  
  RETURN access_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
