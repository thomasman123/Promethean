import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentPeriod } from '@/lib/kpi-calculator'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get('account_id')
  const userId = searchParams.get('user_id') // Optional: filter to specific user
  const kpiId = searchParams.get('kpi_id') // Optional: filter to specific KPI

  if (!accountId) {
    return NextResponse.json({ error: 'Account ID is required' }, { status: 400 })
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

    // Build query for KPI progress with definitions
    let query = supabase
      .from('kpi_progress')
      .select(`
        *,
        kpi_definition:kpi_definitions!inner(
          id,
          account_id,
          name,
          description,
          metric_key,
          target_type,
          period_type,
          applies_to
        )
      `)
      .eq('kpi_definition.account_id', accountId)

    // Filter by user if specified
    if (userId) {
      query = query.or(`user_id.eq.${userId},user_id.is.null`)
    } else {
      // By default, show user's own KPIs and account-level KPIs
      query = query.or(`user_id.eq.${user.id},user_id.is.null`)
    }

    // Filter by KPI if specified
    if (kpiId) {
      query = query.eq('kpi_definition_id', kpiId)
    }

    // Get current period progress (not historical)
    const now = new Date()
    const currentDate = now.toISOString().split('T')[0]
    query = query.gte('period_end', currentDate)

    const { data: progress, error } = await query.order('period_start', { ascending: false })

    if (error) {
      console.error('Error fetching KPI progress:', error)
      return NextResponse.json({ error: 'Failed to fetch KPI progress' }, { status: 500 })
    }

    return NextResponse.json({ progress: progress || [] })

  } catch (error) {
    console.error('Error in KPI progress GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

