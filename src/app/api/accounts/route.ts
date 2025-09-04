import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies })

  try {
    // 1. Get current user
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Determine if the user is an admin (based on the profile row)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError) throw profileError

    const isAdmin = profile?.role === 'admin'

    // 3. Build the accounts response
    let accounts: Array<{ id: string; name: string; description: string | null; role?: string }> = []

    if (isAdmin) {
      // Admins can see all active accounts
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name, description')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      accounts = data ?? []
    } else {
      /**
       * Non-admins:
       *  ‑ Join account_access → accounts in one query.
       *  ‑ account_access.row includes the user’s role.
       *  ‑ `accounts` table row is embedded via the foreign-key join.
       *  => This avoids the two-step recursion-prone approach.
       */
      const { data, error } = await supabase
        .from('account_access')
        .select(
          `role,
           accounts (
             id,
             name,
             description,
             is_active
           )`
        )
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (error) throw error

      accounts = (data ?? []).flatMap((row: any) => {
        const { role } = row
        const acc = row.accounts as any | null

        if (acc && acc.is_active) {
          return [{ id: acc.id, name: acc.name, description: acc.description, role }]
        }
        return []
      })
    }

    return NextResponse.json({ accounts })
  } catch (error) {
    console.error('Get accounts error:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch accounts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 