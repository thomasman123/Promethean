import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get('account_id')

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

    const { data: kpis, error } = await supabase
      .from('kpi_definitions')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching KPI definitions:', error)
      return NextResponse.json({ error: 'Failed to fetch KPI definitions' }, { status: 500 })
    }

    return NextResponse.json({ kpis: kpis || [] })

  } catch (error) {
    console.error('Error in KPI definitions GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      account_id,
      name,
      description,
      metric_key,
      target_value,
      target_type,
      period_type,
      period_days,
      applies_to,
      assigned_user_ids,
      assigned_roles
    } = body

    // Validate required fields
    if (!account_id || !name || !metric_key || !target_value || !target_type || !period_type || !applies_to) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check moderator access
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'

    if (!isAdmin) {
      const { data: access } = await supabase
        .from('account_access')
        .select('role')
        .eq('user_id', user.id)
        .eq('account_id', account_id)
        .in('role', ['admin', 'moderator'])
        .single()
      
      if (!access) {
        return NextResponse.json({ error: 'Moderator access required' }, { status: 403 })
      }
    }

    // Create KPI definition
    const { data: kpi, error } = await supabase
      .from('kpi_definitions')
      .insert({
        account_id,
        name,
        description,
        metric_key,
        target_value: parseFloat(target_value),
        target_type,
        period_type,
        period_days: period_days ? parseInt(period_days) : null,
        applies_to,
        assigned_user_ids: assigned_user_ids || null,
        assigned_roles: assigned_roles || null,
        created_by: user.id,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating KPI definition:', error)
      return NextResponse.json({ error: 'Failed to create KPI definition' }, { status: 500 })
    }

    return NextResponse.json({ kpi })

  } catch (error) {
    console.error('Error in KPI definitions POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
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

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'KPI ID is required' }, { status: 400 })
    }

    // Get KPI to check account access
    const { data: existingKpi } = await supabase
      .from('kpi_definitions')
      .select('account_id')
      .eq('id', id)
      .single()

    if (!existingKpi) {
      return NextResponse.json({ error: 'KPI not found' }, { status: 404 })
    }

    // Check moderator access
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'

    if (!isAdmin) {
      const { data: access } = await supabase
        .from('account_access')
        .select('role')
        .eq('user_id', user.id)
        .eq('account_id', existingKpi.account_id)
        .in('role', ['admin', 'moderator'])
        .single()
      
      if (!access) {
        return NextResponse.json({ error: 'Moderator access required' }, { status: 403 })
      }
    }

    // Update KPI
    const { data: kpi, error } = await supabase
      .from('kpi_definitions')
      .update({
        ...updates,
        target_value: updates.target_value ? parseFloat(updates.target_value) : undefined,
        period_days: updates.period_days ? parseInt(updates.period_days) : undefined
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating KPI definition:', error)
      return NextResponse.json({ error: 'Failed to update KPI definition' }, { status: 500 })
    }

    return NextResponse.json({ kpi })

  } catch (error) {
    console.error('Error in KPI definitions PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
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

    // Get KPI to check account access
    const { data: existingKpi } = await supabase
      .from('kpi_definitions')
      .select('account_id')
      .eq('id', id)
      .single()

    if (!existingKpi) {
      return NextResponse.json({ error: 'KPI not found' }, { status: 404 })
    }

    // Check moderator access
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'

    if (!isAdmin) {
      const { data: access } = await supabase
        .from('account_access')
        .select('role')
        .eq('user_id', user.id)
        .eq('account_id', existingKpi.account_id)
        .in('role', ['admin', 'moderator'])
        .single()
      
      if (!access) {
        return NextResponse.json({ error: 'Moderator access required' }, { status: 403 })
      }
    }

    // Delete KPI (cascade will delete related progress and history)
    const { error } = await supabase
      .from('kpi_definitions')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting KPI definition:', error)
      return NextResponse.json({ error: 'Failed to delete KPI definition' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error in KPI definitions DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

