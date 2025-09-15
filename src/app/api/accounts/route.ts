import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )

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
    let accounts: Array<{ id: string; name: string; description: string | null; role?: string; created_at?: string; is_active?: boolean }> = []

    if (isAdmin) {
      // Admins can see all active accounts
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name, description, created_at, is_active')
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
             created_at,
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
          return [{ id: acc.id, name: acc.name, description: acc.description, created_at: acc.created_at, is_active: acc.is_active, role }]
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

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )

  try {
    // 1. Get current user and verify they're an admin
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Only admins can create accounts' }, { status: 403 })
    }

    // 2. Parse request body
    const body = await request.json()
    const { name, description } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Account name is required' }, { status: 400 })
    }

    // 3. Create the account
    const { data: newAccount, error: createError } = await supabase
      .from('accounts')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        is_active: true
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating account:', createError)
      return NextResponse.json(
        { 
          error: 'Failed to create account',
          message: createError.message 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      account: newAccount 
    })

  } catch (error) {
    console.error('Create account error:', error)

    return NextResponse.json(
      {
        error: 'Failed to create account',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 