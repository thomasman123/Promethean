import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function handleAppointment(payload: any) {
  const data = payload.appointment ? payload : { type: payload.type || 'appointment.created', appointment: payload }
  if (data.type !== 'appointment.created') {
    return { status: 200, body: { success: true, message: 'Event type not handled' } }
  }

  const appt = data.appointment
  const { data: mapping } = await supabaseService
    .from('calendar_mappings')
    .select('*')
    .eq('ghl_calendar_id', appt.calendarId)
    .eq('is_enabled', true)
    .single()

  if (!mapping) {
    return { status: 200, body: { success: true, message: 'No active mapping for this calendar' } }
  }

  const contact = appt.contact
  const contactName = contact?.name || `${contact?.firstName || ''} ${contact?.lastName || ''}`.trim() || 'Unknown'

  const appointmentRow = {
    account_id: mapping.account_id,
    contact_name: contactName,
    email: contact?.email || null,
    phone: contact?.phone || null,
    date_booked: new Date().toISOString(),
    date_booked_for: appt.startTime,
    setter: 'Webhook',
    sales_rep: null,
  }

  if (mapping.target_table === 'appointments') {
    const { error } = await supabaseService.from('appointments').insert({
      ...appointmentRow,
      call_outcome: null,
      cash_collected: null,
      lead_quality: null,
      objections: null,
      pitched: null,
      show_outcome: null,
      total_sales_value: null,
      watched_assets: null,
    })
    if (error) return { status: 500, body: { success: false, error: 'Failed to save appointment' } }
  } else if (mapping.target_table === 'discoveries') {
    const { error } = await supabaseService.from('discoveries').insert({
      ...appointmentRow,
      call_outcome: null,
      show_outcome: null,
    })
    if (error) return { status: 500, body: { success: false, error: 'Failed to save discovery' } }
  }

  return { status: 200, body: { success: true, message: `Appointment synced to ${mapping.target_table}` } }
}

async function handleDial(payload: any) {
  const dial = payload.dial || payload
  if (!dial?.contactName || !dial?.phone) {
    return { status: 400, body: { success: false, error: 'Missing required fields for dial: contactName, phone' } }
  }

  const insert = {
    contact_name: dial.contactName,
    phone: dial.phone,
    email: dial.email || null,
    setter: dial.setter || 'Webhook',
    duration: typeof dial.duration === 'number' ? dial.duration : 0,
    answered: Boolean(dial.answered) || false,
    meaningful_conversation: Boolean(dial.meaningful_conversation) || false,
    call_recording_link: dial.call_recording_link || null,
    date_called: dial.date_called || new Date().toISOString(),
  }

  const { error } = await supabaseService.from('dials').insert(insert)
  if (error) return { status: 500, body: { success: false, error: 'Failed to save dial' } }
  return { status: 200, body: { success: true, message: 'Dial saved' } }
}

function detectKind(payload: any): 'appointment' | 'dial' | 'unknown' {
  if (payload?.appointment || (typeof payload?.type === 'string' && payload.type.startsWith('appointment'))) return 'appointment'
  if (payload?.dial || (payload?.contactName && payload?.phone) || (typeof payload?.type === 'string' && payload.type.includes('dial'))) return 'dial'
  return 'unknown'
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()

    // If batched array, process each and aggregate results
    if (Array.isArray(payload)) {
      const results = [] as Array<{ kind: string; status: number; body: any }>
      for (const item of payload) {
        const kind = detectKind(item)
        if (kind === 'appointment') {
          results.push({ kind, ...(await handleAppointment(item)) })
        } else if (kind === 'dial') {
          results.push({ kind, ...(await handleDial(item)) })
        } else {
          results.push({ kind: 'unknown', status: 400, body: { success: false, error: 'Unknown payload' } })
        }
      }
      return NextResponse.json({ success: true, results })
    }

    // Single payload
    const kind = detectKind(payload)
    if (kind === 'appointment') {
      const res = await handleAppointment(payload)
      return NextResponse.json(res.body, { status: res.status })
    }
    if (kind === 'dial') {
      const res = await handleDial(payload)
      return NextResponse.json(res.body, { status: res.status })
    }

    return NextResponse.json({ success: false, error: 'Unknown payload' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Invalid JSON or server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const challenge = searchParams.get('challenge')
  if (challenge) return new Response(challenge)
  return NextResponse.json({ message: 'Unified Webhook Endpoint' })
} 