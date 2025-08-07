import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Export types for use in components
export type Tables = Database['public']['Tables']
export type Accounts = Tables['accounts']['Row']
export type Appointments = Tables['appointments']['Row']
export type Dials = Tables['dials']['Row']
export type Discoveries = Tables['discoveries']['Row'] 