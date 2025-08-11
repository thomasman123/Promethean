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
    : eventStr.includes('inboundmessage') || eventStr.includes('outboundmessage')
    ? 'inboundMessage'
    : eventStr.includes('outboundmessage') || eventStr.includes('dial')
    ? 'dial'
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

  // Get GHL connection to fetch appointment details
  const connection = await fetchGhlConnectionByLocation(locationId, logger)
  if (!connection || !connection.access_token) {
    logger.log('handleAppointment: no GHL connection, using fallback setter')
  }

  let setterName = 'Webhook' // fallback
  let contactName = appointmentData.contactName || appointmentData.title || 'Unknown Contact'
  let contactEmail = null
  let contactPhone = null
  let salesRep = null
  let appointmentMetadata = null

  // Fetch appointment details to get the real setter
  if (connection?.access_token && appointmentData.id) {
    const appointmentDetails = await fetchAppointmentDetails(appointmentData.id, connection.access_token, logger)
    
    if (appointmentDetails?.createdBy?.userId) {
      const userDetails = await fetchUserDetails(appointmentDetails.createdBy.userId, connection.access_token, logger)
      if (userDetails?.name) {
        setterName = userDetails.name
        logger.log('handleAppointment: found setter', { setterName, userId: appointmentDetails.createdBy.userId })
      } else {
        logger.log('handleAppointment: could not fetch user details, using userId as setter', { userId: appointmentDetails.createdBy.userId })
        setterName = appointmentDetails.createdBy.userId
      }
    } else {
      logger.log('handleAppointment: no createdBy.userId in appointment details')
    }

    // Get sales rep from assigned user
    if (appointmentDetails?.assignedUserId) {
      const assignedUser = await fetchUserDetails(appointmentDetails.assignedUserId, connection.access_token, logger)
      if (assignedUser?.name) {
        salesRep = assignedUser.name
        logger.log('handleAppointment: found sales rep', { salesRep, assignedUserId: appointmentDetails.assignedUserId })
      } else {
        logger.log('handleAppointment: could not fetch assigned user details, using userId as sales rep', { assignedUserId: appointmentDetails.assignedUserId })
        salesRep = appointmentDetails.assignedUserId
      }
    }

    // Fetch contact details
    let contact = null
    if (appointmentDetails?.contactId) {
      contact = await fetchContactDetails(appointmentDetails.contactId, connection.access_token, logger)
      if (contact) {
        contactName = contact.name || contact.firstName + ' ' + contact.lastName || contactName
        contactEmail = contact.email
        contactPhone = contact.phone
        logger.log('handleAppointment: found contact details', { 
          contactName, 
          contactEmail, 
          contactPhone, 
          contactId: appointmentDetails.contactId 
        })
      }
    }

    // Also get better contact name from appointment details if available
    if (appointmentDetails?.title) {
      // Only use title if we didn't get a good contact name
      if (!contactName || contactName === 'Unknown Contact') {
        contactName = appointmentDetails.title
      }
    }

    // Create metadata object with all additional data
    appointmentMetadata = {
      end_time: appointmentDetails.endTime,
      status: appointmentDetails.appointmentStatus,
      notes: appointmentDetails.notes,
      source: appointmentDetails.source || appointmentData.source,
      address: appointmentDetails.address,
      is_recurring: appointmentDetails.isRecurring,
      date_added: appointmentDetails.dateAdded,
      date_updated: appointmentDetails.dateUpdated,
      ghl_appointment_id: appointmentDetails.id,
      // Add contact metadata if available
      contact_source: contact?.source || null,
      contact_tags: contact?.tags || null,
      contact_assigned_to: contact?.assignedTo || null,
      contact_last_activity: contact?.lastActivity || null
    }
    
    logger.log('handleAppointment: created metadata', { 
      endTime: appointmentMetadata.end_time,
      status: appointmentMetadata.status,
      source: appointmentMetadata.source,
      contactTags: appointmentMetadata.contact_tags
    })
  }

  const appointmentRow: any = {
    account_id: mapping.account_id,
    contact_name: contactName,
    email: contactEmail,
    phone: contactPhone,
    date_booked: new Date().toISOString(),
    date_booked_for: appointmentData.startTime,
  }

  // Handle field semantics differently based on target table
  if (mapping.target_table === 'discoveries') {
    // For discoveries: setter = booked_user (who conducted the discovery)
    // sales_rep will be determined later when linked to appointments
    appointmentRow.setter = setterName  // This is the "booked_user" - who conducted the discovery
    appointmentRow.sales_rep = null     // Will be populated later from linked appointment's assigned user
    logger.log('handleAppointment: discoveries - booked_user set', { booked_user: setterName })
  } else {
    // For appointments: setter = who booked it (often same as discovery booked_user)
    // sales_rep = assigned user from GHL
    appointmentRow.setter = setterName  // Who booked the appointment
    appointmentRow.sales_rep = salesRep // Assigned user from GHL
    logger.log('handleAppointment: appointments - setter and sales_rep set', { setter: setterName, sales_rep: salesRep })
  }
  
  // Add metadata if we have it
  if (appointmentMetadata) {
    appointmentRow.metadata = appointmentMetadata
  }
  logger.log('handleAppointment: prepared row', { 
    target_table: mapping.target_table,
    contact_name: appointmentRow.contact_name,
    setter: appointmentRow.setter,
    sales_rep: appointmentRow.sales_rep
  })

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
      show_outcome: null, // Will be 'booked' or 'not booked' - set manually later
    })
    if (error) {
      logger.log('handleAppointment: insert discoveries failed', { code: error.code, message: error.message, details: error.details })
      return { status: 500, body: { success: false, error: 'Failed to save discovery' } }
    }
  }

  const logMessage = mapping.target_table === 'discoveries' 
    ? `Discovery call synced - booked_user: ${appointmentRow.setter}` 
    : `Appointment synced - setter: ${appointmentRow.setter}, sales_rep: ${appointmentRow.sales_rep}`
  
  logger.log('handleAppointment: success', { 
    target: mapping.target_table, 
    setter_or_booked_user: appointmentRow.setter,
    sales_rep: appointmentRow.sales_rep 
  })
  return { 
    status: 200, 
    body: { 
      success: true, 
      message: logMessage,
      target_table: mapping.target_table,
      setter: appointmentRow.setter,
      sales_rep: appointmentRow.sales_rep
    } 
  }
}

async function handleDial(payload: any, logger: Logger, opts?: { accountId?: string; defaultSetter?: string }) {
  logger.log('handleDial: processing GHL call/message', { 
    messageId: payload.messageId,
    contactId: payload.contactId,
    direction: payload.direction,
    messageType: payload.messageType,
    phone: payload.phone,
    setter: payload.setter
  })
  
  // Extract contact info - handle both old and new formats
  const contactName = payload.contactName || 
    `${payload.contactFirstName || ''} ${payload.contactLastName || ''}`.trim() || 
    'Unknown Contact'
  const phone = payload.contactPhone || payload.phone || 'Unknown'

  const insert: any = {
    contact_name: contactName,
    phone: phone,
    email: payload.contactEmail || payload.email || null,
    setter: payload.setterName || payload.setter || opts?.defaultSetter || 'Webhook',
    duration: typeof payload.callDuration === 'number' ? payload.callDuration : (payload.duration || 0),
    answered: Boolean(payload.answered) || false,
    meaningful_conversation: Boolean(payload.meaningful_conversation) || false,
    call_recording_link: payload.recordingUrl || payload.call_recording_link || null,
    date_called: payload.dateCreated || payload.date_called || payload.timestamp || new Date().toISOString(),
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

async function fetchAppointmentDetails(appointmentId: string, accessToken: string, logger: Logger) {
  try {
    const response = await fetch(`https://services.leadconnectorhq.com/calendars/events/appointments/${appointmentId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Version': '2021-04-15',
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      logger.log('fetchAppointmentDetails: API error', { status: response.status, statusText: response.statusText })
      return null
    }

    const data = await response.json()
    logger.log('fetchAppointmentDetails: success', { appointmentId, hasEvent: !!data.event })
    return data.event
  } catch (error) {
    logger.log('fetchAppointmentDetails: error', { error: error instanceof Error ? error.message : String(error) })
    return null
  }
}

async function fetchContactDetails(contactId: string, accessToken: string, logger: Logger) {
  try {
    const response = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Version': '2021-07-28',
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      logger.log('fetchContactDetails: API error', { status: response.status, statusText: response.statusText })
      return null
    }

    const data = await response.json()
    logger.log('fetchContactDetails: success', { contactId, hasContact: !!data.contact })
    return data.contact
  } catch (error) {
    logger.log('fetchContactDetails: error', { error: error instanceof Error ? error.message : String(error) })
    return null
  }
}

async function fetchUserDetails(userId: string, accessToken: string, logger: Logger) {
  try {
    const response = await fetch(`https://services.leadconnectorhq.com/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Version': '2021-07-28',
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      logger.log('fetchUserDetails: API error', { status: response.status, statusText: response.statusText })
      return null
    }

    const data = await response.json()
    logger.log('fetchUserDetails: success', { userId, hasUser: !!data.name })
    return data
  } catch (error) {
    logger.log('fetchUserDetails: error', { error: error instanceof Error ? error.message : String(error) })
    return null
  }
}

async function handleInboundMessage(payload: any, logger: Logger) {
  const locationId: string | undefined = payload.locationId
  const contactId: string | undefined = payload.contactId
  const messageType: string = payload.messageType || 'Unknown'
  const direction: string = payload.direction || 'inbound'

  logger.log('handleInboundMessage: processing GHL message webhook', { 
    type: payload.type,
    locationId, 
    contactId, 
    messageType,
    direction,
    callDuration: payload.callDuration,
    callStatus: payload.callStatus,
    status: payload.status
  })
  
  if (!locationId || !contactId) {
    logger.log('handleInboundMessage: missing required fields', { locationId, contactId })
    return { status: 400, body: { success: false, error: 'Missing locationId or contactId' } }
  }

  const connection = await fetchGhlConnectionByLocation(locationId, logger)
  if (!connection || !connection.access_token) {
    logger.log('handleInboundMessage: no connection or token')
    return { status: 404, body: { success: false, error: 'No GHL connection for this location' } }
  }

  // Create dial entry for inbound message/call
  const dialPayload = {
    contactId: contactId,
    messageType: messageType,
    direction: direction,
    messageBody: payload.body || '',
    callDuration: payload.callDuration || 0,
    callStatus: payload.callStatus || payload.status || 'unknown',
    recordingUrl: Array.isArray(payload.attachments) && payload.attachments.length > 0 ? payload.attachments[0] : null,
    dateReceived: payload.dateAdded || new Date().toISOString(),
    conversationId: payload.conversationId,
    messageId: payload.messageId
  }
  
  logger.log('handleInboundMessage: prepared dial payload', dialPayload)

  // Determine if this should be treated as a meaningful conversation
  const isMeaningfulConversation = messageType === 'CALL' 
    ? (payload.callStatus === 'completed' || payload.status === 'completed')
    : true // SMS, Email, etc. are considered meaningful

  const isAnswered = messageType === 'CALL' 
    ? (payload.callStatus === 'completed' || payload.status === 'completed')
    : true // Non-call messages are considered "answered"

  // Create dial entry using existing pattern
  const dialData = {
    phone: 'UNKNOWN', // Will need to fetch from contact
    email: null, // Will need to fetch from contact  
    setter: `${messageType} ${direction}`,
    answered: isAnswered,
    meaningful_conversation: isMeaningfulConversation,
    duration: payload.callDuration || 0,
    call_recording_link: dialPayload.recordingUrl,
    date_called: dialPayload.dateReceived,
  }

  return handleDial(dialData, logger, { accountId: connection.account_id, defaultSetter: `${messageType} Inbound` })
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