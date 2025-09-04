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

    // Try the function approach first
    try {
      const { data, error } = await supabase.rpc('get_user_accounts', {
        p_user_id: user.id
      })

      if (!error && data) {
        return NextResponse.json({ accounts: data })
      }
    } catch (funcError) {
      console.log('Function approach failed, trying simple function:', funcError)
    }

    // Fallback to simple function that just returns all accounts
    try {
      const { data, error } = await supabase.rpc('get_all_accounts_simple')
      
      if (!error && data) {
        return NextResponse.json({ accounts: data })
      }
    } catch (simpleFuncError) {
      console.log('Simple function failed, direct query:', simpleFuncError)
    }

    // Last resort: direct query to accounts table
    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('id, name, description')
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Direct accounts query error:', error)
      return NextResponse.json({ accounts: [] })
    }

    return NextResponse.json({ accounts: accounts || [] })
    
  } catch (error) {
    console.error('Get accounts error:', error)
    return NextResponse.json({ accounts: [] })
  }
} 