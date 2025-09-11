import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)

// Service role client for server-side operations that need to bypass RLS
export const supabaseService = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
  }
})

// Export types for use in components
export type Tables = Database['public']['Tables']
export type Accounts = Tables['accounts']['Row']
export type Appointments = Tables['appointments']['Row']
export type Dials = Tables['dials']['Row']
export type Discoveries = Tables['discoveries']['Row']
export type Profiles = Tables['profiles']['Row']
export type AccountAccess = Tables['account_access']['Row']

// Auth types
export type UserRole = Database['public']['Enums']['user_role'] 