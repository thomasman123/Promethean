import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type Logger = {
  log: (msg: string, meta?: any) => void
  dump: () => string[]
}

function createLogger(ctx: { requestId: string }) : Logger {
  const lines: string[] = []
  const prefix = `[webhook:${ctx.requestId}]`
  return {
    log: (msg, meta) => {
      const line = `${prefix} ${msg}${meta !== undefined ? ' ' + safeStringify(meta) : ''}`
      lines.push(line)
      try { console.log(line) } catch {}
    },
    dump: () => lines,
  }
}

function safeStringify(value: any) {
  try { return JSON.stringify(value) } catch { return String(value) }
}

async function handleAppointment(payload: any, logger: Logger) {
  const data = payload.appointment ? payload : { type: payload.type || 'appointment.created', appointment: payload }
  logger.log('handleAppointment: normalized payload', { hasAppointment: !!data.appointment, type: data.type })
  if (data.type !== 'appointment.created') {
    return { status: 200, body: { success: true, message: 'Event type not handled' } }
  }

  const appt = data.appointment
  logger.log('handleAppointment: appointment core fields', { calendarId: appt?.calendarId, startTime: appt?.startTime })
  const { data: mapping, error: mapErr } = await supabaseService
    .from('calendar_mappings')
    .select('*')
    .eq('ghl_calendar_id', appt.calendarId)
    .eq('is_enabled', true)
    .single()
  if (mapErr) logger.log('handleAppointment: mapping query error', { code: mapErr.code, message: mapErr.message })

  if (!mapping) {
    logger.log('handleAppointment: no mapping found, skipping')
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
  logger.log('handleAppointment: prepared row', appointmentRow)

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
    if (error) {
      logger.log('handleAppointment: insert appointments failed', { code: error.code, message: error.message, details: error.details })
      return { status: 500, body: { success: false, error: 'Failed to save appointment' } }
    }
  } else if (mapping.target_table === 'discoveries') {
    const { error } = await supabaseService.from('discoveries').insert({
      ...appointmentRow,
      call_outcome: null,
      show_outcome: null,
    })
    if (error) {
      logger.log('handleAppointment: insert discoveries failed', { code: error.code, message: error.message, details: error.details })
      return { status: 500, body: { success: false, error: 'Failed to save discovery' } }
    }
  }

  logger.log('handleAppointment: success', { target: mapping.target_table })
  return { status: 200, body: { success: true, message: `Appointment synced to ${mapping.target_table}` } }
}

async function handleDial(payload: any, logger: Logger, opts?: { accountId?: string; defaultSetter?: string }) {
  const dial = payload.dial || payload
  logger.log('handleDial: normalized payload', { hasDial: !!payload.dial })
  if (!dial?.contactName || !dial?.phone) {
    logger.log('handleDial: missing required fields', { contactName: !!dial?.contactName, phone: !!dial?.phone })
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
  logger.log('handleDial: prepared row', insert)

  const { error } = await supabaseService.from('dials').insert(insert)
  if (error) {
    logger.log('handleDial: insert failed', { code: error.code, message: error.message, details: error.details })
    return { status: 500, body: { success: false, error: 'Failed to save dial' } }
  }
  logger.log('handleDial: success')
  return { status: 200, body: { success: true, message: 'Dial saved' } }
}

function detectKind(payload: any, logger?: Logger): 'appointment' | 'dial' | 'inboundMessage' | 'unknown' {
  const type = (payload?.type || '').toString().toLowerCase()
  const kind = payload?.appointment || type.startsWith('appointment')
    ? 'appointment'
    : (payload?.dial || (payload?.contactName && payload?.phone) || type.includes('dial'))
    ? 'dial'
    : (type.includes('inboundmessage') || type.includes('message.created') || (payload?.message && payload?.direction === 'inbound'))
    ? 'inboundMessage'
    : 'unknown'
  if (logger) logger.log('detectKind', { type, resolved: kind })
  return kind
}

async function fetchGhlConnectionByLocation(locationId?: string, logger?: Logger) {
  if (!locationId) return null
  const { data, error } = await supabaseService
    .from('ghl_connections')
    .select('*')
    .eq('ghl_location_id', locationId)
    .eq('is_connected', true)
    .single()
  if (error) logger?.log('fetchGhlConnectionByLocation error', { code: error.code, message: error.message })
  logger?.log('fetchGhlConnectionByLocation result', { hasConnection: !!data })
  return data
}

async function fetchGhlContact(headers: Record<string, string>, contactId: string, locationId?: string, logger?: Logger) {
  const pathUrl = `https://services.leadconnectorhq.com/contacts/${encodeURIComponent(contactId)}`
  const hdrs = { ...headers }
  if (locationId) hdrs['Location'] = locationId
  let resp = await fetch(pathUrl, { headers: hdrs })
  logger?.log('fetchGhlContact path attempt', { status: resp.status })
  if (!resp.ok) {
    const urlWithQuery = new URL('https://services.leadconnectorhq.com/contacts/')
    urlWithQuery.searchParams.set('id', contactId)
    resp = await fetch(urlWithQuery.toString(), { headers: hdrs })
    logger?.log('fetchGhlContact query attempt', { status: resp.status })
  }
  if (!resp.ok) return null
  const data = await resp.json().catch(() => null)
  return data?.contact || data
}

async function fetchGhlUsers(headers: Record<string, string>, locationId?: string, logger?: Logger) {
  const hdrs = { ...headers }
  if (locationId) hdrs['Location'] = locationId
  let resp = await fetch('https://services.leadconnectorhq.com/users/', { headers: hdrs })
  logger?.log('fetchGhlUsers base attempt', { status: resp.status })
  if (!resp.ok && locationId && (resp.status === 403 || resp.status === 422)) {
    const urlWithQuery = new URL('https://services.leadconnectorhq.com/users/')
    urlWithQuery.searchParams.set('locationId', locationId)
    resp = await fetch(urlWithQuery.toString(), { headers: headers })
    logger?.log('fetchGhlUsers query attempt', { status: resp.status })
  }
  if (!resp.ok) return []
  const data = await resp.json().catch(() => ({}))
  return data.users || []
}

async function handleInboundMessage(payload: any, logger: Logger) {
  const locationId: string | undefined = payload.locationId || payload.location_id
  const contactId: string | undefined = payload.contactId || payload.contact_id
  const userId: string | undefined = payload.userId || payload.user_id

  logger.log('handleInboundMessage: core fields', { locationId, contactId, userId })
  if (!locationId || !contactId) {
    return { status: 400, body: { success: false, error: 'Missing locationId or contactId' } }
  }

  const connection = await fetchGhlConnectionByLocation(locationId, logger)
  if (!connection || !connection.access_token) {
    logger.log('handleInboundMessage: no connection or token')
    return { status: 404, body: { success: false, error: 'No GHL connection for this location' } }
  }

  const baseHeaders: Record<string, string> = {
    Authorization: `Bearer ${connection.access_token}`,
    Version: '2021-07-28',
    Accept: 'application/json',
  }

  const contact = await fetchGhlContact(baseHeaders, contactId, locationId, logger)
  const contactName = contact?.name || `${contact?.firstName || ''} ${contact?.lastName || ''}`.trim() || 'Unknown'
  const phone = contact?.phone || contact?.phoneNumber || null
  const email = contact?.email || null

  let setterName: string | undefined = undefined
  if (userId) {
    const users = await fetchGhlUsers(baseHeaders, locationId, logger)
    const u = Array.isArray(users) ? users.find((x: any) => x.id === userId) : undefined
    setterName = u?.name || u?.fullName || u?.email || undefined
  }

  const dialPayload = {
    contactName,
    phone: phone || 'UNKNOWN',
    email,
    setter: setterName || 'Inbound Message',
    answered: true,
    meaningful_conversation: true,
    date_called: new Date().toISOString(),
  }
  logger.log('handleInboundMessage: derived dial', dialPayload)

  return handleDial({ dial: dialPayload }, logger, { accountId: connection.account_id, defaultSetter: 'Inbound Message' })
}

export async function POST(request: NextRequest) {
  const requestId = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`)
  const logger = createLogger({ requestId })
  try {
    const debug = (new URL(request.url)).searchParams.get('debug') === '1' || process.env.WEBHOOK_DEBUG === '1'
    const headersToLog = ['user-agent', 'x-forwarded-for', 'x-real-ip', 'x-vercel-ip-country']
    const headerMeta: Record<string, string> = {}
    headersToLog.forEach(h => {
      const v = request.headers.get(h)
      if (v) headerMeta[h] = v
    })
    logger.log('POST /api/webhooks received', headerMeta)

    const payload = await request.json()
    logger.log('request payload', { isArray: Array.isArray(payload), keys: Object.keys(payload || {}) })

    if (Array.isArray(payload)) {
      const results = [] as Array<{ kind: string; status: number; body: any }>
      for (const item of payload) {
        const kind = detectKind(item, logger)
        if (kind === 'appointment') {
          results.push({ kind, ...(await handleAppointment(item, logger)) })
        } else if (kind === 'dial') {
          results.push({ kind, ...(await handleDial(item, logger)) })
        } else if (kind === 'inboundMessage') {
          results.push({ kind, ...(await handleInboundMessage(item, logger)) })
        } else {
          results.push({ kind: 'unknown', status: 400, body: { success: false, error: 'Unknown payload' } })
        }
      }
      const body = { success: true, results, ...(debug ? { logs: logger.dump() } : {}) }
      return NextResponse.json(body)
    }

    const kind = detectKind(payload, logger)
    if (kind === 'appointment') {
      const res = await handleAppointment(payload, logger)
      const body = { ...res.body, ...(debug ? { logs: logger.dump() } : {}) }
      return NextResponse.json(body, { status: res.status })
    }
    if (kind === 'dial') {
      const res = await handleDial(payload, logger)
      const body = { ...res.body, ...(debug ? { logs: logger.dump() } : {}) }
      return NextResponse.json(body, { status: res.status })
    }
    if (kind === 'inboundMessage') {
      const res = await handleInboundMessage(payload, logger)
      const body = { ...res.body, ...(debug ? { logs: logger.dump() } : {}) }
      return NextResponse.json(body, { status: res.status })
    }

    const body = { success: false, error: 'Unknown payload', ...(debug ? { logs: logger.dump() } : {}) }
    return NextResponse.json(body, { status: 400 })
  } catch (error: any) {
    logger.log('POST /api/webhooks exception', { message: error?.message || String(error) })
    const body = { success: false, error: 'Invalid JSON or server error', logs: logger.dump() }
    return NextResponse.json(body, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  // Support GHL's subscription verification via returning the raw challenge
  const { searchParams } = new URL(request.url)
  const challenge = searchParams.get('challenge')
  if (challenge) {
    return new Response(challenge)
  }
  const debug = searchParams.get('debug') === '1'
  const meta = {
    message: 'Unified Webhook Endpoint',
    ...(debug ? { env: {
      hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    }} : {}),
  }
  return NextResponse.json(meta)
} 