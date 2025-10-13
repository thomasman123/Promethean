import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
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

    // Determine effective user (considering impersonation)
    const impersonatedUserId = cookieStore.get('impersonate_user_id')?.value
    let effectiveUserId = user.id
    
    if (impersonatedUserId) {
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (adminProfile?.role === 'admin') {
        effectiveUserId = impersonatedUserId
      }
    }

    // Calculate the cutoff time (24 hours ago)
    const cutoffTime = new Date()
    cutoffTime.setHours(cutoffTime.getHours() - 24)
    const cutoffTimeISO = cutoffTime.toISOString()

    // Fetch overdue discoveries (where user is setter)
    const { data: discoveriesData, error: discoveriesError } = await supabase
      .from('discoveries')
      .select(`
        id,
        date_booked_for,
        accounts!inner (
          id,
          name
        ),
        contacts!inner (
          name,
          email
        )
      `)
      .eq('setter_user_id', effectiveUserId)
      .eq('data_filled', false)
      .lte('date_booked_for', cutoffTimeISO)
      .order('date_booked_for', { ascending: true })
      .limit(50)

    if (discoveriesError) {
      console.error('Error fetching overdue discoveries:', discoveriesError)
      return NextResponse.json({ error: 'Failed to fetch overdue discoveries' }, { status: 500 })
    }

    // Fetch overdue appointments (where user is sales rep)
    const { data: appointmentsData, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        date_booked_for,
        accounts!inner (
          id,
          name
        ),
        contacts!inner (
          name,
          email
        )
      `)
      .eq('sales_rep_user_id', effectiveUserId)
      .eq('data_filled', false)
      .lte('date_booked_for', cutoffTimeISO)
      .order('date_booked_for', { ascending: true })
      .limit(50)

    if (appointmentsError) {
      console.error('Error fetching overdue appointments:', appointmentsError)
      return NextResponse.json({ error: 'Failed to fetch overdue appointments' }, { status: 500 })
    }

    // Map discoveries
    const discoveries = (discoveriesData || []).map((disc: any) => {
      const dateBooked = new Date(disc.date_booked_for)
      const now = new Date()
      const overdueHours = Math.floor((now.getTime() - dateBooked.getTime()) / (1000 * 60 * 60))
      
      return {
        id: disc.id,
        type: 'discovery' as const,
        contact_name: disc.contacts?.name || 'Unknown Contact',
        contact_email: disc.contacts?.email || '',
        date_booked_for: disc.date_booked_for,
        overdue_hours: overdueHours,
        account_name: disc.accounts?.name || 'Unknown Account'
      }
    })

    // Map appointments
    const appointments = (appointmentsData || []).map((apt: any) => {
      const dateBooked = new Date(apt.date_booked_for)
      const now = new Date()
      const overdueHours = Math.floor((now.getTime() - dateBooked.getTime()) / (1000 * 60 * 60))
      
      return {
        id: apt.id,
        type: 'appointment' as const,
        contact_name: apt.contacts?.name || 'Unknown Contact',
        contact_email: apt.contacts?.email || '',
        date_booked_for: apt.date_booked_for,
        overdue_hours: overdueHours,
        account_name: apt.accounts?.name || 'Unknown Account'
      }
    })

    // Combine and sort by most overdue first
    const allOverdue = [...discoveries, ...appointments].sort((a, b) => b.overdue_hours - a.overdue_hours)

    return NextResponse.json({ 
      items: allOverdue,
      count: allOverdue.length,
      discoveries: discoveries.length,
      appointments: appointments.length
    })

  } catch (error) {
    console.error('Error in overdue notifications API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
