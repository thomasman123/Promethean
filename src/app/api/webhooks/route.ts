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

function detectKind(payload: any, logger?: Logger): 'appointment' | 'dial' | 'inboundMessage' | 'unknown' {
  // Official GHL webhook format uses 'type' field
  const eventType = payload?.type || payload?.event || ''
  const eventStr = eventType.toString().toLowerCase()
  
  const kind = eventStr.includes('appointmentcreate') || eventStr.includes('appointment')
    ? 'appointment'
    : eventStr.includes('outboundmessage') || eventStr.includes('dial')
    ? 'dial'
    : eventStr.includes('inboundmessage') || eventStr.includes('message')
    ? 'inboundMessage'
    : 'unknown'
    
  if (logger) logger.log('detectKind', { eventType, resolved: kind, payloadKeys: Object.keys(payload || {}) })
  return kind
}

async function handleAppointment(payload: any, logger: Logger) {
  // Handle both formats: direct fields and nested appointment object
  const appointmentData = payload.appointment || payload
  const locationId = payload.locationId || appointmentData.locationId
  
  logger.log('handleAppointment: processing GHL appointment webhook', { 
    type: payload.type,
    appointmentId: appointmentData.id, 
    calendarId: appointmentData.calendarId,
    locationId: locationId,
    hasNestedAppointment: !!payload.appointment
  })

  const { data: mappings, error: mapErr } = await supabaseService
    .from('calendar_mappings')
    .select('*')
    .eq('ghl_calendar_id', appointmentData.calendarId)
    .eq('is_enabled', true)
    .limit(1)
  
  if (mapErr) logger.log('handleAppointment: mapping query error', { code: mapErr.code, message: mapErr.message })

  const mapping = mappings && mappings.length > 0 ? mappings[0] : null
  
  if (!mapping) {
    logger.log('handleAppointment: no mapping found, skipping', { 
      calendarId: appointmentData.calendarId,
      mappingsFound: mappings?.length || 0 
    })
    return { status: 200, body: { success: true, message: 'No active mapping for this calendar' } }
  }

  // Extract contact info - need to fetch from GHL API using contactId
  const contactName = appointmentData.contactName || 
    appointmentData.title || 
    'Unknown Contact'

  const appointmentRow = {
    account_id: mapping.account_id,
    contact_name: contactName,
    email: null, // Will need to fetch from contact API
    phone: null, // Will need to fetch from contact API
    date_booked: new Date().toISOString(),
    date_booked_for: appointmentData.startTime,
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
  logger.log('handleDial: processing GHL marketplace call', { 
    messageId: payload.messageId,
    contactId: payload.contactId,
    direction: payload.direction 
  })
  
  // Extract dial info from GHL marketplace payload
  const contactName = payload.contactName || 
    `${payload.contactFirstName || ''} ${payload.contactLastName || ''}`.trim() || 
    'Unknown'
  const phone = payload.contactPhone || payload.phone || 'Unknown'

  const insert: any = {
    contact_name: contactName,
    phone: phone,
    email: payload.contactEmail || null,
    setter: payload.setterName || opts?.defaultSetter || 'Webhook',
    duration: typeof payload.callDuration === 'number' ? payload.callDuration : 0,
    answered: Boolean(payload.answered) || false,
    meaningful_conversation: Boolean(payload.meaningful_conversation) || false,
    call_recording_link: payload.recordingUrl || null,
    date_called: payload.dateCreated || payload.timestamp || new Date().toISOString(),
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

async function handleInboundMessage(payload: any, logger: Logger) {
  const locationId: string | undefined = payload.locationId
  const contactId: string | undefined = payload.contactId

  logger.log('handleInboundMessage: core fields', { locationId, contactId })
  if (!locationId || !contactId) {
    return { status: 400, body: { success: false, error: 'Missing locationId or contactId' } }
  }

  const connection = await fetchGhlConnectionByLocation(locationId, logger)
  if (!connection || !connection.access_token) {
    logger.log('handleInboundMessage: no connection or token')
    return { status: 404, body: { success: false, error: 'No GHL connection for this location' } }
  }

  // Create dial entry for inbound message
  const dialPayload = {
    contactName: payload.contactName || 'Unknown',
    phone: payload.contactPhone || 'UNKNOWN',
    email: payload.contactEmail || null,
    setter: 'Inbound Message',
    answered: true,
    meaningful_conversation: true,
    date_called: payload.dateCreated || new Date().toISOString(),
  }
  logger.log('handleInboundMessage: derived dial', dialPayload)

  return handleDial(dialPayload, logger, { accountId: connection.account_id, defaultSetter: 'Inbound Message' })
}

export async function POST(request: NextRequest) {
  const requestId = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`)
  const logger = createLogger({ requestId })
  
  try {
    const debug = (new URL(request.url)).searchParams.get('debug') === '1' || process.env.WEBHOOK_DEBUG === '1'
    
    // Enhanced logging for debugging
    const allHeaders: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      allHeaders[key] = value
    })
    logger.log('FULL REQUEST HEADERS', allHeaders)
    
    const headersToLog = ['user-agent', 'x-forwarded-for', 'x-real-ip', 'x-vercel-ip-country', 'content-type', 'authorization', 'x-ghl-signature']
    const headerMeta: Record<string, string> = {}
    headersToLog.forEach(h => {
      const v = request.headers.get(h)
      if (v) headerMeta[h] = v
    })
    logger.log('POST /api/webhooks received', headerMeta)

    // Read raw body for GHL marketplace webhooks
    const rawBody = await request.text()
    logger.log('raw body received', { length: rawBody.length, preview: rawBody.substring(0, 200) })
    
    // Parse JSON after reading raw body
    const payload = JSON.parse(rawBody)
    logger.log('parsed payload FULL', payload)
    logger.log('request payload summary', { 
      event: payload.event, 
      type: payload.type, 
      locationId: payload.locationId,
      calendarId: payload.calendarId,
      appointmentId: payload.id || payload.appointmentId,
      keys: Object.keys(payload || {}) 
    })

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

    // Log unknown events for debugging
    logger.log('Unknown webhook event', { event: payload.event, type: payload.type })
    const body = { success: true, message: 'Event received but not handled', ...(debug ? { logs: logger.dump() } : {}) }
    return NextResponse.json(body, { status: 200 })
    
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
    message: 'Unified Webhook Endpoint - GHL Marketplace Ready',
    ...(debug ? { env: {
      hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    }} : {}),
  }
  return NextResponse.json(meta)
} 