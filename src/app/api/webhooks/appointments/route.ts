import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase service client for webhook operations
const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface AppointmentWebhookPayload {
  type: string
  locationId?: string
  appointmentId?: string
  appointment: {
    id: string
    calendarId: string
    contactId?: string
    startTime: string
    endTime: string
    title?: string
    appointmentStatus?: string
    assignedUserId?: string
    notes?: string
    address?: string
    contact?: {
      id?: string
      firstName?: string
      lastName?: string
      email?: string
      phone?: string
      name?: string
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const webhookData: AppointmentWebhookPayload = await request.json()

    // Only handle appointment creation events
    if (webhookData.type !== 'appointment.created') {
      return NextResponse.json({ success: true, message: 'Event type not handled' })
    }

    const { appointment } = webhookData

    // Find the calendar mapping for this calendar
    const { data: mapping } = await supabaseService
      .from('calendar_mappings')
      .select('*')
      .eq('ghl_calendar_id', appointment.calendarId)
      .eq('is_enabled', true)
      .single()

    if (!mapping) {
      return NextResponse.json({ 
        success: true, 
        message: 'No active mapping for this calendar' 
      })
    }

    // Prepare contact information
    const contact = appointment.contact
    const contactName = contact?.name || 
      `${contact?.firstName || ''} ${contact?.lastName || ''}`.trim() || 
      'Unknown'

    // Prepare appointment data based on target table
    const appointmentData = {
      account_id: mapping.account_id,
      contact_name: contactName,
      email: contact?.email || null,
      phone: contact?.phone || null,
      date_booked: new Date().toISOString(),
      date_booked_for: appointment.startTime,
      setter: 'Webhook',
      sales_rep: null,
    }

    if (mapping.target_table === 'appointments') {
      const { error: insertError } = await supabaseService
        .from('appointments')
        .insert({
          ...appointmentData,
          call_outcome: null,
          cash_collected: null,
          lead_quality: null,
          objections: null,
          pitched: null,
          show_outcome: null,
          total_sales_value: null,
          watched_assets: null,
        })

      if (insertError) {
        return NextResponse.json({ success: false, error: 'Failed to save appointment' }, { status: 500 })
      }
    } else if (mapping.target_table === 'discoveries') {
      const { error: insertError } = await supabaseService
        .from('discoveries')
        .insert({
          ...appointmentData,
          call_outcome: null,
          show_outcome: null,
        })

      if (insertError) {
        return NextResponse.json({ success: false, error: 'Failed to save discovery' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, message: `Appointment synced to ${mapping.target_table}` })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// Optional verification endpoint (echoes back ?challenge=... if provided)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const challenge = searchParams.get('challenge')

  if (challenge) {
    return new Response(challenge)
  }

  return NextResponse.json({ message: 'Appointments Webhook Endpoint' })
} 