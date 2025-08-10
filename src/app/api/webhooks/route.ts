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

async function handleDial(payload: any, opts?: { accountId?: string; defaultSetter?: string }) {
  const dial = payload.dial || payload
  if (!dial?.contactName || !dial?.phone) {
    return { status: 400, body: { success: false, error: 'Missing required fields for dial: contactName, phone' } }
  }

  const insert: any = {
    contact_name: dial.contactName,
    phone: dial.phone,
    email: dial.email || null,
    setter: dial.setter || opts?.defaultSetter || 'Webhook',
    duration: typeof dial.duration === 'number' ? dial.duration : 0,
    answered: Boolean(dial.answered) || false,
    meaningful_conversation: Boolean(dial.meaningful_conversation) || false,
    call_recording_link: dial.call_recording_link || null,
    date_called: dial.date_called || new Date().toISOString(),
  }

  if (opts?.accountId) insert.account_id = opts.accountId

  const { error } = await supabaseService.from('dials').insert(insert)
  if (error) return { status: 500, body: { success: false, error: 'Failed to save dial' } }
  return { status: 200, body: { success: true, message: 'Dial saved' } }
}

function detectKind(payload: any): 'appointment' | 'dial' | 'inboundMessage' | 'unknown' {
  const type = (payload?.type || '').toString().toLowerCase()
  if (payload?.appointment || type.startsWith('appointment')) return 'appointment'
  if (payload?.dial || (payload?.contactName && payload?.phone) || type.includes('dial')) return 'dial'
  if (type.includes('inboundmessage') || type.includes('message.created') || (payload?.message && payload?.direction === 'inbound')) return 'inboundMessage'
  return 'unknown'
}

async function fetchGhlConnectionByLocation(locationId?: string) {
  if (!locationId) return null
  const { data } = await supabaseService
    .from('ghl_connections')
    .select('*')
    .eq('ghl_location_id', locationId)
    .eq('is_connected', true)
    .single()
  return data
}

async function fetchGhlContact(headers: Record<string, string>, contactId: string, locationId?: string) {
  const pathUrl = `https://services.leadconnectorhq.com/contacts/${encodeURIComponent(contactId)}`
  const hdrs = { ...headers }
  if (locationId) hdrs['Location'] = locationId
  let resp = await fetch(pathUrl, { headers: hdrs })
  if (!resp.ok) {
    const urlWithQuery = new URL('https://services.leadconnectorhq.com/contacts/')
    urlWithQuery.searchParams.set('id', contactId)
    resp = await fetch(urlWithQuery.toString(), { headers: hdrs })
  }
  if (!resp.ok) return null
  const data = await resp.json().catch(() => null)
  return data?.contact || data
}

async function fetchGhlUsers(headers: Record<string, string>, locationId?: string) {
  const hdrs = { ...headers }
  if (locationId) hdrs['Location'] = locationId
  let resp = await fetch('https://services.leadconnectorhq.com/users/', { headers: hdrs })
  if (!resp.ok && locationId && (resp.status === 403 || resp.status === 422)) {
    const urlWithQuery = new URL('https://services.leadconnectorhq.com/users/')
    urlWithQuery.searchParams.set('locationId', locationId)
    resp = await fetch(urlWithQuery.toString(), { headers: headers })
  }
  if (!resp.ok) return []
  const data = await resp.json().catch(() => ({}))
  return data.users || []
}

async function handleInboundMessage(payload: any) {
  // Expected fields: type, locationId, contactId, userId?, message, direction
  const locationId: string | undefined = payload.locationId || payload.location_id
  const contactId: string | undefined = payload.contactId || payload.contact_id
  const userId: string | undefined = payload.userId || payload.user_id

  if (!locationId || !contactId) {
    return { status: 400, body: { success: false, error: 'Missing locationId or contactId' } }
  }

  // Find connection for this location to resolve account and get token
  const connection = await fetchGhlConnectionByLocation(locationId)
  if (!connection || !connection.access_token) {
    return { status: 404, body: { success: false, error: 'No GHL connection for this location' } }
  }

  const baseHeaders: Record<string, string> = {
    Authorization: `Bearer ${connection.access_token}`,
    Version: '2021-07-28',
    Accept: 'application/json',
  }

  // Fetch contact details
  const contact = await fetchGhlContact(baseHeaders, contactId, locationId)
  const contactName = contact?.name || `${contact?.firstName || ''} ${contact?.lastName || ''}`.trim() || 'Unknown'
  const phone = contact?.phone || contact?.phoneNumber || null
  const email = contact?.email || null

  // Try to resolve setter name from userId if present
  let setterName: string | undefined = undefined
  if (userId) {
    const users = await fetchGhlUsers(baseHeaders, locationId)
    const u = Array.isArray(users) ? users.find((x: any) => x.id === userId) : undefined
    setterName = u?.name || u?.fullName || u?.email || undefined
  }

  // Build dial payload
  const dialPayload = {
    contactName,
    phone: phone || 'UNKNOWN',
    email,
    setter: setterName || 'Inbound Message',
    answered: true,
    meaningful_conversation: true,
    date_called: new Date().toISOString(),
  }

  return handleDial({ dial: dialPayload }, { accountId: connection.account_id, defaultSetter: 'Inbound Message' })
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()

    if (Array.isArray(payload)) {
      const results = [] as Array<{ kind: string; status: number; body: any }>
      for (const item of payload) {
        const kind = detectKind(item)
        if (kind === 'appointment') {
          results.push({ kind, ...(await handleAppointment(item)) })
        } else if (kind === 'dial') {
          results.push({ kind, ...(await handleDial(item)) })
        } else if (kind === 'inboundMessage') {
          results.push({ kind, ...(await handleInboundMessage(item)) })
        } else {
          results.push({ kind: 'unknown', status: 400, body: { success: false, error: 'Unknown payload' } })
        }
      }
      return NextResponse.json({ success: true, results })
    }

    const kind = detectKind(payload)
    if (kind === 'appointment') {
      const res = await handleAppointment(payload)
      return NextResponse.json(res.body, { status: res.status })
    }
    if (kind === 'dial') {
      const res = await handleDial(payload)
      return NextResponse.json(res.body, { status: res.status })
    }
    if (kind === 'inboundMessage') {
      const res = await handleInboundMessage(payload)
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