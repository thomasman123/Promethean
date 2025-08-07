-- Create user roles enum
CREATE TYPE user_role AS ENUM ('admin', 'moderator', 'sales_rep', 'setter');

-- Create profiles table to extend Supabase auth.users
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  avatar_url TEXT,
  role user_role DEFAULT 'setter' NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create account_access table for user-account relationships
CREATE TABLE account_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  role user_role DEFAULT 'setter' NOT NULL,
  granted_by UUID REFERENCES profiles(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Ensure unique user-account combination
  UNIQUE(user_id, account_id)
);

-- Add RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_access ENABLE ROW LEVEL SECURITY;

-- Create updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_account_access_updated_at BEFORE UPDATE ON account_access
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_is_active ON profiles(is_active);

CREATE INDEX idx_account_access_user_id ON account_access(user_id);
CREATE INDEX idx_account_access_account_id ON account_access(account_id);
CREATE INDEX idx_account_access_role ON account_access(role);
CREATE INDEX idx_account_access_is_active ON account_access(is_active);

-- Create RLS policies
-- Profiles: Users can read their own profile, admins can read all
CREATE POLICY "Users can read own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Account access: Users can see their own access, moderators can see access for their accounts
CREATE POLICY "Users can read own account access" ON account_access
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Moderators can read account access for their accounts" ON account_access
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM account_access aa2
            WHERE aa2.user_id = auth.uid() 
            AND aa2.account_id = account_access.account_id
            AND aa2.role IN ('admin', 'moderator')
            AND aa2.is_active = true
        )
    );

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
