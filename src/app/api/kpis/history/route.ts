import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const kpiId = searchParams.get('kpi_id')
  const userId = searchParams.get('user_id') // Optional
  const limit = parseInt(searchParams.get('limit') || '30')

  if (!kpiId) {
    return NextResponse.json({ error: 'KPI ID is required' }, { status: 400 })
  }

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

    let query = supabase
      .from('kpi_history')
      .select('*')
      .eq('kpi_definition_id', kpiId)
      .order('period_start', { ascending: false })
      .limit(limit)

    // Filter by user if specified
    if (userId) {
      query = query.or(`user_id.eq.${userId},user_id.is.null`)
    } else {
      // By default, show user's own history and account-level history
      query = query.or(`user_id.eq.${user.id},user_id.is.null`)
    }

    const { data: history, error } = await query

    if (error) {
      console.error('Error fetching KPI history:', error)
      return NextResponse.json({ error: 'Failed to fetch KPI history' }, { status: 500 })
    }

    return NextResponse.json({ history: history || [] })

  } catch (error) {
    console.error('Error in KPI history GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

