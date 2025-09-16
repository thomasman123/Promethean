import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
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

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin (only admins can trigger overdue checks)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    console.log('🔍 [overdue-notifications] Starting overdue check...')

    // Find overdue appointments (24+ hours past date_booked_for with no call_outcome)
    const { data: overdueAppointments, error: apptError } = await supabase
      .from('appointments')
      .select(`
        id,
        account_id,
        sales_rep_user_id,
        date_booked_for,
        setter,
        sales_rep,
        contacts!left (
          name,
          email
        )
      `)
      .lt('date_booked_for', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .or('call_outcome.is.null,call_outcome.eq.')
      .not('sales_rep_user_id', 'is', null)

    if (apptError) {
      console.error('Error fetching overdue appointments:', apptError)
      return NextResponse.json({ error: 'Failed to check appointments' }, { status: 500 })
    }

    // Find overdue discoveries (24+ hours past date_booked_for with no call_outcome)
    const { data: overdueDiscoveries, error: discError } = await supabase
      .from('discoveries')
      .select(`
        id,
        account_id,
        setter_user_id,
        date_booked_for,
        setter,
        contacts!left (
          name,
          email
        )
      `)
      .lt('date_booked_for', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .or('call_outcome.is.null,call_outcome.eq.')
      .not('setter_user_id', 'is', null)

    if (discError) {
      console.error('Error fetching overdue discoveries:', discError)
      return NextResponse.json({ error: 'Failed to check discoveries' }, { status: 500 })
    }

    console.log(`🔍 Found ${overdueAppointments?.length || 0} overdue appointments, ${overdueDiscoveries?.length || 0} overdue discoveries`)

    let notificationsCreated = 0

    // Create notifications for overdue appointments
    if (overdueAppointments && overdueAppointments.length > 0) {
      for (const appointment of overdueAppointments) {
        // Check if notification already exists
        const { data: existingNotification } = await supabase
          .from('follow_up_notifications')
          .select('id')
          .eq('user_id', appointment.sales_rep_user_id)
          .like('title', '%Overdue Appointment%')
          .like('message', `%${appointment.id}%`)
          .single()

        if (!existingNotification) {
          const contactName = appointment.contacts?.[0]?.name || 'Unknown Contact'
          const appointmentDate = new Date(appointment.date_booked_for).toLocaleDateString()
          
          const { error: notifError } = await supabase
            .from('follow_up_notifications')
            .insert({
              user_id: appointment.sales_rep_user_id,
              account_id: appointment.account_id,
              notification_type: 'overdue',
              title: 'Overdue Appointment Needs Update',
              message: `Appointment with ${contactName} scheduled for ${appointmentDate} is overdue and needs a call outcome update. (ID: ${appointment.id})`,
              scheduled_for: new Date().toISOString(),
              action_url: '/update-data/appointments-discoveries',
              metadata: {
                appointment_id: appointment.id,
                overdue_type: 'appointment',
                contact_name: contactName,
                scheduled_date: appointment.date_booked_for
              }
            })

          if (!notifError) {
            notificationsCreated++
            console.log(`✅ Created overdue notification for appointment ${appointment.id}`)
          } else {
            console.error(`❌ Failed to create notification for appointment ${appointment.id}:`, notifError)
          }
        }
      }
    }

    // Create notifications for overdue discoveries
    if (overdueDiscoveries && overdueDiscoveries.length > 0) {
      for (const discovery of overdueDiscoveries) {
        // Check if notification already exists
        const { data: existingNotification } = await supabase
          .from('follow_up_notifications')
          .select('id')
          .eq('user_id', discovery.setter_user_id)
          .like('title', '%Overdue Discovery%')
          .like('message', `%${discovery.id}%`)
          .single()

        if (!existingNotification) {
          const contactName = discovery.contacts?.[0]?.name || 'Unknown Contact'
          const discoveryDate = new Date(discovery.date_booked_for).toLocaleDateString()
          
          const { error: notifError } = await supabase
            .from('follow_up_notifications')
            .insert({
              user_id: discovery.setter_user_id,
              account_id: discovery.account_id,
              notification_type: 'overdue',
              title: 'Overdue Discovery Needs Update',
              message: `Discovery call with ${contactName} scheduled for ${discoveryDate} is overdue and needs a call outcome update. (ID: ${discovery.id})`,
              scheduled_for: new Date().toISOString(),
              action_url: '/update-data/appointments-discoveries',
              metadata: {
                discovery_id: discovery.id,
                overdue_type: 'discovery',
                contact_name: contactName,
                scheduled_date: discovery.date_booked_for
              }
            })

          if (!notifError) {
            notificationsCreated++
            console.log(`✅ Created overdue notification for discovery ${discovery.id}`)
          } else {
            console.error(`❌ Failed to create notification for discovery ${discovery.id}:`, notifError)
          }
        }
      }
    }

    console.log(`✅ [overdue-notifications] Created ${notificationsCreated} new overdue notifications`)

    return NextResponse.json({
      success: true,
      overdueAppointments: overdueAppointments?.length || 0,
      overdueDiscoveries: overdueDiscoveries?.length || 0,
      notificationsCreated,
      message: `Found ${(overdueAppointments?.length || 0) + (overdueDiscoveries?.length || 0)} overdue items, created ${notificationsCreated} new notifications`
    })

  } catch (error) {
    console.error('Error in overdue notifications API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to manually check overdue status
export async function GET(request: NextRequest) {
  try {
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

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Count overdue items without creating notifications
    const { data: overdueAppointments } = await supabase
      .from('appointments')
      .select('id, date_booked_for, sales_rep_user_id')
      .lt('date_booked_for', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .or('call_outcome.is.null,call_outcome.eq.')
      .not('sales_rep_user_id', 'is', null)

    const { data: overdueDiscoveries } = await supabase
      .from('discoveries')
      .select('id, date_booked_for, setter_user_id')
      .lt('date_booked_for', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .or('call_outcome.is.null,call_outcome.eq.')
      .not('setter_user_id', 'is', null)

    return NextResponse.json({
      overdueAppointments: overdueAppointments?.length || 0,
      overdueDiscoveries: overdueDiscoveries?.length || 0,
      total: (overdueAppointments?.length || 0) + (overdueDiscoveries?.length || 0)
    })

  } catch (error) {
    console.error('Error checking overdue status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 