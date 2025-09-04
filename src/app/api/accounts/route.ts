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

    let accounts: any[] = []

    // Check if user is an admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'

    if (isAdmin) {
      // Admins see all active accounts
      const { data, error } = await supabase
        .from('accounts')
        .select(`
          id,
          name,
          description
        `)
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      accounts = data || []
    } else {
      // Regular users - fetch account access separately to avoid recursion
      try {
        // First get account IDs the user has access to
        const { data: accessData, error: accessError } = await supabase
          .from('account_access')
          .select('account_id, role')
          .eq('user_id', user.id)
          .eq('is_active', true)

        if (accessError) throw accessError

        if (accessData && accessData.length > 0) {
          // Then fetch account details
          const accountIds = accessData.map(a => a.account_id)
          const { data: accountsData, error: accountsError } = await supabase
            .from('accounts')
            .select('id, name, description')
            .in('id', accountIds)
            .eq('is_active', true)
            .order('name')

          if (accountsError) throw accountsError

          // Merge role information
          accounts = accountsData?.map(account => {
            const access = accessData.find(a => a.account_id === account.id)
            return {
              ...account,
              role: access?.role
            }
          }) || []
        }
      } catch (error) {
        console.error('Error in account access query:', error)
        // If there's still a recursion error, return empty accounts
        accounts = []
      }
    }

    return NextResponse.json({ accounts })
  } catch (error) {
    console.error('Get accounts error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch accounts',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 