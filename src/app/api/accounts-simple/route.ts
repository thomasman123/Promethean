import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

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
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check for impersonation
    const impersonatedUserId = cookieStore.get('impersonate_user_id')?.value
    let effectiveUserId = user.id
    
    if (impersonatedUserId) {
      // Verify the current user is an admin
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (adminProfile?.role === 'admin') {
        effectiveUserId = impersonatedUserId
      }
    }

    // Check if effective user is admin
    const { data: effectiveProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', effectiveUserId)
      .single()
    
    const isEffectiveAdmin = effectiveProfile?.role === 'admin'

    // Get accounts based on effective user's permissions
    let accounts: Array<{ id: string; name: string; description: string | null }> = []

    if (isEffectiveAdmin) {
      // Effective user is admin - show all accounts
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name, description')
        .eq('is_active', true)
        .order('name')

      if (error) {
        console.error('Admin accounts query error:', error)
        return NextResponse.json({ accounts: [] })
      }
      
      accounts = data || []
    } else {
      // Non-admin effective user - show only their accounts
      const { data, error } = await supabase
        .from('account_access')
        .select(`
          role,
          accounts (
            id,
            name,
            description,
            is_active
          )
        `)
        .eq('user_id', effectiveUserId)
        .eq('is_active', true)

      if (error) {
        console.error('User accounts query error:', error)
        return NextResponse.json({ accounts: [] })
      }

      accounts = (data || []).flatMap((row: any) => {
        const acc = row.accounts as any | null
        if (acc && acc.is_active) {
          return [{ id: acc.id, name: acc.name, description: acc.description }]
        }
        return []
      })
    }

    return NextResponse.json({ accounts })
    
  } catch (error) {
    console.error('Get accounts error:', error)
    return NextResponse.json({ accounts: [] })
  }
} 