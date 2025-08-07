import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create supabase service client for webhook operations
const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface GHLAppointmentWebhook {
  type: string
  locationId: string
  appointmentId: string
  appointment: {
    id: string
    calendarId: string
    contactId: string
    startTime: string
    endTime: string
    title: string
    appointmentStatus: string
    assignedUserId?: string
    notes?: string
    address?: string
    contact?: {
      id: string
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
    const webhookData: GHLAppointmentWebhook = await request.json()
    
    console.log('Received GHL appointment webhook:', {
      type: webhookData.type,
      appointmentId: webhookData.appointmentId,
      locationId: webhookData.locationId
    })

    // Only handle appointment creation events
    if (webhookData.type !== 'appointment.created') {
      return NextResponse.json({ success: true, message: 'Event type not handled' })
    }

    const { appointment } = webhookData

    // Find the calendar mapping for this calendar
    const { data: mapping, error: mappingError } = await supabaseService
      .from('calendar_mappings')
      .select('*')
      .eq('ghl_calendar_id', appointment.calendarId)
      .eq('is_enabled', true)
      .single()

    if (mappingError || !mapping) {
      console.log('No active mapping found for calendar:', appointment.calendarId)
      return NextResponse.json({ 
        success: true, 
        message: 'No active mapping for this calendar' 
      })
    }

    // Get contact information
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
      setter: 'GHL Webhook', // Default setter name
      sales_rep: null, // Will be updated if we can resolve assignedUserId
    }

    if (mapping.target_table === 'appointments') {
      // Insert into appointments table
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
        console.error('Error inserting appointment:', insertError)
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to save appointment' 
        }, { status: 500 })
      }
    } else if (mapping.target_table === 'discoveries') {
      // Insert into discoveries table
      const { error: insertError } = await supabaseService
        .from('discoveries')
        .insert({
          ...appointmentData,
          call_outcome: null,
          show_outcome: null,
        })

      if (insertError) {
        console.error('Error inserting discovery:', insertError)
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to save discovery' 
        }, { status: 500 })
      }
    }

    console.log(`Successfully synced appointment to ${mapping.target_table} table`)

    return NextResponse.json({ 
      success: true, 
      message: `Appointment synced to ${mapping.target_table}` 
    })

  } catch (error) {
    console.error('Error processing appointment webhook:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// Handle GET requests for webhook verification (if needed by GHL)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const challenge = searchParams.get('challenge')
  
  if (challenge) {
    return new Response(challenge)
  }
  
  return NextResponse.json({ message: 'GHL Appointment Webhook Endpoint' })
} 