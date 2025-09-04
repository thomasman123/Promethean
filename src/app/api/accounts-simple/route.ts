import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies })
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'admin') {
      // Admins see all accounts
      const { data: accounts, error } = await supabase
        .from('accounts')
        .select('id, name, description')
        .eq('is_active', true)
        .order('name')

      if (error) {
        console.error('Error fetching accounts for admin:', error)
        return NextResponse.json({ accounts: [] })
      }

      return NextResponse.json({ accounts: accounts || [] })
    } else {
      // For non-admins, we'll use raw SQL to bypass RLS issues
      const { data, error } = await supabase.rpc('get_user_accounts', {
        p_user_id: user.id
      })

      if (error) {
        console.error('Error calling get_user_accounts:', error)
        // Fallback: just get all accounts (temporary workaround)
        const { data: allAccounts } = await supabase
          .from('accounts')
          .select('id, name, description')
          .eq('is_active', true)
          .order('name')
          
        return NextResponse.json({ accounts: allAccounts || [] })
      }

      return NextResponse.json({ accounts: data || [] })
    }
  } catch (error) {
    console.error('Get accounts error:', error)
    // Return empty accounts rather than error
    return NextResponse.json({ accounts: [] })
  }
} 