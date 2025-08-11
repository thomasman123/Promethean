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

// Test function to verify webhook appointment.id vs API eventId
async function testAppointmentIdMapping(appointmentId: string, locationId?: string) {
  console.log(`[APPOINTMENT TEST] Starting ID verification for appointment: ${appointmentId}`)
  
  try {
    // Find an account with API access for this location (or any account if locationId not provided)
    const accountQuery = supabaseService
      .from('accounts')
      .select('id, name, ghl_api_key, ghl_location_id')
      .not('ghl_api_key', 'is', null)

    if (locationId) {
      accountQuery.eq('ghl_location_id', locationId)
    }

    const { data: accounts, error: accountError } = await accountQuery.limit(1)

    if (accountError) {
      console.error('[APPOINTMENT TEST] Error fetching account:', accountError)
      return
    }

    if (!accounts || accounts.length === 0) {
      console.log('[APPOINTMENT TEST] No account found with API access' + (locationId ? ` for location ${locationId}` : ''))
      return
    }

    const account = accounts[0]
    console.log(`[APPOINTMENT TEST] Using account: ${account.name} (${account.id})`)

    // Call GHL appointments API
    const apiUrl = `https://services.leadconnectorhq.com/calendars/events/appointments/${appointmentId}`
    console.log(`[APPOINTMENT TEST] Calling API: ${apiUrl}`)

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${account.ghl_api_key}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json'
      }
    })

    console.log(`[APPOINTMENT TEST] API Response Status: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[APPOINTMENT TEST] API Error Response: ${errorText}`)
      return
    }

    const apiData = await response.json()
    console.log('[APPOINTMENT TEST] Full API Response:', JSON.stringify(apiData, null, 2))

    // Compare IDs
    const apiEventId = apiData.eventId || apiData.id
    console.log(`[APPOINTMENT TEST] ID Comparison:`)
    console.log(`  Webhook appointment.id: ${appointmentId}`)
    console.log(`  API eventId/id: ${apiEventId}`)
    console.log(`  IDs Match: ${appointmentId === apiEventId}`)

    // Log any other relevant fields
    if (apiData.calendarId) {
      console.log(`  API calendarId: ${apiData.calendarId}`)
    }
    if (apiData.appointmentStatus) {
      console.log(`  API appointmentStatus: ${apiData.appointmentStatus}`)
    }

  } catch (error) {
    console.error('[APPOINTMENT TEST] Exception during ID verification:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const webhookData: AppointmentWebhookPayload = await request.json()

    console.log('[APPOINTMENT WEBHOOK] Received webhook:', JSON.stringify(webhookData, null, 2))

    // TEST MIDDLEWARE: Verify appointment ID mapping
    if (webhookData.appointment?.id) {
      await testAppointmentIdMapping(webhookData.appointment.id, webhookData.locationId)
    }

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
    console.error('[APPOINTMENT WEBHOOK] Error processing webhook:', error)
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