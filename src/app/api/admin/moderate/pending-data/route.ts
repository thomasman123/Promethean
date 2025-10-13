import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get('account_id')
  const userId = searchParams.get('user_id') // Optional: filter by specific user
  const type = searchParams.get('type') // Optional: 'appointment' or 'discovery'
  const overdueOnly = searchParams.get('overdue_only') === 'true'

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

    // Check if user is admin (global access)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'

    // If not admin, check moderator access for the specific account
    if (!isAdmin) {
      const { data: access } = await supabase
        .from('account_access')
        .select('role')
        .eq('user_id', user.id)
        .eq('account_id', accountId)
        .in('role', ['admin', 'moderator'])
        .single()
      
      if (!access) {
        return NextResponse.json({ error: 'Moderator access denied' }, { status: 403 })
      }
    }

    // Use service role for querying all user data
    const serviceSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get() { return undefined },
          set() {},
          remove() {},
        },
      }
    )

    // Calculate cutoff time for overdue (24 hours ago)
    const cutoffTime = new Date()
    cutoffTime.setHours(cutoffTime.getHours() - 24)
    const cutoffTimeISO = cutoffTime.toISOString()

    let items: any[] = []

    // Fetch appointments if not filtered to discoveries only
    if (type !== 'discovery') {
      let appointmentsQuery = serviceSupabase
        .from('appointments')
        .select(`
          id,
          account_id,
          date_booked_for,
          sales_rep_user_id,
          accounts!inner (
            id,
            name
          ),
          contacts!inner (
            name,
            email
          ),
          sales_rep:profiles!appointments_sales_rep_user_id_fkey (
            id,
            full_name
          )
        `)
        .eq('account_id', accountId)
        .eq('data_filled', false)
        .order('date_booked_for', { ascending: true })

      if (userId) {
        appointmentsQuery = appointmentsQuery.eq('sales_rep_user_id', userId)
      }

      if (overdueOnly) {
        appointmentsQuery = appointmentsQuery.lte('date_booked_for', cutoffTimeISO)
      }

      const { data: appointmentsData, error: appointmentsError } = await appointmentsQuery

      if (appointmentsError) {
        console.error('Error fetching appointments:', appointmentsError)
      } else {
        const mappedAppointments = (appointmentsData || []).map((apt: any) => {
          const dateBooked = new Date(apt.date_booked_for)
          const now = new Date()
          const overdueHours = Math.floor((now.getTime() - dateBooked.getTime()) / (1000 * 60 * 60))
          const isOverdue = overdueHours >= 24

          return {
            id: apt.id,
            type: 'appointment' as const,
            account_id: apt.account_id,
            account_name: apt.accounts?.name || 'Unknown Account',
            contact_name: apt.contacts?.name || 'Unknown Contact',
            contact_email: apt.contacts?.email || '',
            date_booked_for: apt.date_booked_for,
            assigned_user_name: apt.sales_rep?.full_name || 'Unknown User',
            assigned_user_id: apt.sales_rep_user_id,
            is_overdue: isOverdue,
            overdue_hours: isOverdue ? overdueHours : undefined
          }
        })
        items = [...items, ...mappedAppointments]
      }
    }

    // Fetch discoveries if not filtered to appointments only
    if (type !== 'appointment') {
      let discoveriesQuery = serviceSupabase
        .from('discoveries')
        .select(`
          id,
          account_id,
          date_booked_for,
          setter_user_id,
          accounts!inner (
            id,
            name
          ),
          contacts!inner (
            name,
            email
          ),
          setter:profiles!discoveries_setter_user_id_fkey (
            id,
            full_name
          )
        `)
        .eq('account_id', accountId)
        .eq('data_filled', false)
        .order('date_booked_for', { ascending: true })

      if (userId) {
        discoveriesQuery = discoveriesQuery.eq('setter_user_id', userId)
      }

      if (overdueOnly) {
        discoveriesQuery = discoveriesQuery.lte('date_booked_for', cutoffTimeISO)
      }

      const { data: discoveriesData, error: discoveriesError } = await discoveriesQuery

      if (discoveriesError) {
        console.error('Error fetching discoveries:', discoveriesError)
      } else {
        const mappedDiscoveries = (discoveriesData || []).map((disc: any) => {
          const dateBooked = new Date(disc.date_booked_for)
          const now = new Date()
          const overdueHours = Math.floor((now.getTime() - dateBooked.getTime()) / (1000 * 60 * 60))
          const isOverdue = overdueHours >= 24

          return {
            id: disc.id,
            type: 'discovery' as const,
            account_id: disc.account_id,
            account_name: disc.accounts?.name || 'Unknown Account',
            contact_name: disc.contacts?.name || 'Unknown Contact',
            contact_email: disc.contacts?.email || '',
            date_booked_for: disc.date_booked_for,
            assigned_user_name: disc.setter?.full_name || 'Unknown User',
            assigned_user_id: disc.setter_user_id,
            is_overdue: isOverdue,
            overdue_hours: isOverdue ? overdueHours : undefined
          }
        })
        items = [...items, ...mappedDiscoveries]
      }
    }

    // Calculate stats by user
    const userMap = new Map<string, { pending_count: number; overdue_count: number; total_completed: number }>()
    
    for (const item of items) {
      if (!item.assigned_user_id) continue
      
      const existing = userMap.get(item.assigned_user_id) || { pending_count: 0, overdue_count: 0, total_completed: 0 }
      existing.pending_count++
      if (item.is_overdue) existing.overdue_count++
      userMap.set(item.assigned_user_id, existing)
    }

    // Get completion counts for stats
    const userStats = await Promise.all(
      Array.from(userMap.entries()).map(async ([userId, counts]) => {
        // Find user name from items
        const userItem = items.find(item => item.assigned_user_id === userId)
        const userName = userItem?.assigned_user_name || 'Unknown User'

        // Get total completed count for this user
        const { count: completedAppointments } = await serviceSupabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('account_id', accountId)
          .eq('sales_rep_user_id', userId)
          .eq('data_filled', true)
          .gte('updated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days

        const { count: completedDiscoveries } = await serviceSupabase
          .from('discoveries')
          .select('*', { count: 'exact', head: true })
          .eq('account_id', accountId)
          .eq('setter_user_id', userId)
          .eq('data_filled', true)
          .gte('updated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days

        const totalCompleted = (completedAppointments || 0) + (completedDiscoveries || 0)
        const total = counts.pending_count + totalCompleted
        const completionRate = total > 0 ? Math.round((totalCompleted / total) * 100) : 0

        return {
          user_id: userId,
          user_name: userName,
          pending_count: counts.pending_count,
          overdue_count: counts.overdue_count,
          completion_rate: completionRate
        }
      })
    )

    const stats = {
      total_pending: items.length,
      overdue_count: items.filter(item => item.is_overdue).length,
      by_user: userStats
    }

    return NextResponse.json({ 
      items,
      stats
    })

  } catch (error) {
    console.error('Error in moderate pending-data API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

