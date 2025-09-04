import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {},
          remove() {},
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile to check if admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    let accounts

    if (profile?.role === 'admin') {
      // Admins can see all accounts
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name, description')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      accounts = data || []
    } else {
      // Regular users see accounts they have access to
      const { data: accessData, error: accessError } = await supabase
        .from('account_access')
        .select(`
          account_id,
          role,
          accounts!inner (
            id,
            name,
            description
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('accounts.is_active', true)

      if (accessError) throw accessError
      
      accounts = accessData?.map(item => {
        const account = (item as any).accounts
        return {
          id: account?.id,
          name: account?.name,
          description: account?.description,
          role: item.role
        }
      }) || []
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