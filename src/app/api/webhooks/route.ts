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
  
  // Enhanced detection for appointment events
  const isAppointment = eventStr.includes('appointmentcreate') || 
                       eventStr.includes('appointment') ||
                       eventStr === 'appointmentcreate' ||
                       eventStr === 'appointmentcreated' ||
                       payload?.appointment || 
                       payload?.calendarId
  
  const kind = isAppointment
    ? 'appointment'
    : eventStr.includes('inboundmessage') || eventStr.includes('outboundmessage')
    ? 'inboundMessage'
    : eventStr.includes('outboundmessage') || eventStr.includes('dial')
    ? 'dial'
    : 'unknown'
    
  if (logger) logger.log('detectKind', { 
    eventType, 
    resolved: kind, 
    payloadKeys: Object.keys(payload || {}),
    hasAppointmentField: !!payload?.appointment,
    hasCalendarId: !!payload?.calendarId,
    fullPayloadForDebugging: payload
  })
  return kind
}

async function handleAppointment(payload: any, logger: Logger) {
  // Handle both formats: direct fields and nested appointment object
  const appointmentData = payload.appointment || payload
  const locationId = payload.locationId || appointmentData.locationId
  
  // Get calendarId from multiple possible locations in payload
  const calendarId = appointmentData.calendarId || payload.calendarId
  
  logger.log('handleAppointment: processing GHL appointment webhook', { 
    type: payload.type,
    appointmentId: appointmentData.id, 
    calendarId: calendarId,
    locationId: locationId,
    hasNestedAppointment: !!payload.appointment,
    rawCalendarIdSources: {
      appointmentDataCalendarId: appointmentData.calendarId,
      payloadCalendarId: payload.calendarId
    }
  })

  if (!calendarId) {
    logger.log('handleAppointment: no calendarId found in payload', { 
      appointmentData: appointmentData,
      payload: payload
    })
    return { status: 200, body: { success: true, message: 'No calendarId found in webhook payload' } }
  }

  const { data: mappings, error: mapErr } = await supabaseService
    .from('calendar_mappings')
    .select('*')
    .eq('ghl_calendar_id', calendarId)
    .eq('is_enabled', true)
    .limit(1)
  
  if (mapErr) logger.log('handleAppointment: mapping query error', { code: mapErr.code, message: mapErr.message })

  const mapping = mappings && mappings.length > 0 ? mappings[0] : null

  if (!mapping) {
    logger.log('handleAppointment: no mapping found, skipping', { 
      calendarId: calendarId,
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
  if (connection && connection.access_token && appointmentData.id) {
    try {
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
      if (appointmentDetails) {
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
    } catch (apiError) {
      logger.log('handleAppointment: API enrichment failed, continuing with basic data', { 
        error: apiError instanceof Error ? apiError.message : String(apiError),
        appointmentId: appointmentData.id,
        hasConnection: !!connection,
        hasAccessToken: !!connection?.access_token
      })
      // Continue processing with basic webhook data
    }
  } else {
    logger.log('handleAppointment: skipping API enrichment', { 
      hasConnection: !!connection,
      hasAccessToken: !!connection?.access_token,
      hasAppointmentId: !!appointmentData.id
    })
  }

  // Get appointment date/time - try multiple fields
  const appointmentDate = appointmentData.startTime || 
                         appointmentData.start_time || 
                         appointmentData.appointmentStartTime ||
                         appointmentData.date ||
                         new Date().toISOString() // fallback to current time

  logger.log('handleAppointment: appointment date extraction', { 
    startTime: appointmentData.startTime,
    start_time: appointmentData.start_time,
    appointmentStartTime: appointmentData.appointmentStartTime,
    selectedDate: appointmentDate
  })

  const appointmentRow: any = {
    account_id: mapping.account_id,
    contact_name: contactName,
    email: contactEmail,
    phone: contactPhone,
    date_booked: new Date().toISOString(),
    date_booked_for: appointmentDate,
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

async function handleInstallWebhook(payload: any, logger: Logger) {
  logger.log('handleInstallWebhook: processing INSTALL webhook', { 
    appId: payload.appId,
    locationId: payload.locationId,
    companyId: payload.companyId 
  })

  return { status: 200, body: { success: true, message: 'App installed successfully' } }
}

async function fetchGhlConnectionByLocation(locationId?: string, logger?: Logger) {
  if (!locationId) return null
  const { data, error } = await supabaseService
    .from('ghl_connections')
    .select('*')
    .eq('ghl_location_id', locationId)
    .eq('is_connected', true)
    .single()
  
  if (error) {
    logger?.log('fetchGhlConnectionByLocation error', { code: error.code, message: error.message })
    return null
  }
  
  if (!data) {
    logger?.log('fetchGhlConnectionByLocation: no connection found', { locationId })
    return null
  }
  
  // Check if token is expired
  if (data.token_expires_at && new Date(data.token_expires_at) <= new Date()) {
    logger?.log('fetchGhlConnectionByLocation: token expired', { 
      locationId, 
      expiresAt: data.token_expires_at,
      now: new Date().toISOString() 
    })
    return null
  }
  
  logger?.log('fetchGhlConnectionByLocation result', { 
    hasConnection: !!data,
    hasAccessToken: !!data.access_token,
    expiresAt: data.token_expires_at,
    isExpired: data.token_expires_at ? new Date(data.token_expires_at) <= new Date() : false
  })
  return data
}

async function fetchAppointmentDetails(appointmentId: string, accessToken: string, logger: Logger) {
  try {
    const url = `https://services.leadconnectorhq.com/calendars/events/appointments/${appointmentId}`
    logger.log('fetchAppointmentDetails: making API call', { url, appointmentId })
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Version': '2021-04-15',
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.log('fetchAppointmentDetails: API error', { 
        status: response.status, 
        statusText: response.statusText,
        errorText: errorText,
        url: url
      })
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
    const url = `https://services.leadconnectorhq.com/contacts/${contactId}`
    logger.log('fetchContactDetails: making API call', { url, contactId })
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Version': '2021-07-28',
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.log('fetchContactDetails: API error', { 
        status: response.status, 
        statusText: response.statusText,
        errorText: errorText,
        url: url
      })
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
    const url = `https://services.leadconnectorhq.com/users/${userId}`
    logger.log('fetchUserDetails: making API call', { url, userId })
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Version': '2021-07-28',
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.log('fetchUserDetails: API error', { 
        status: response.status, 
        statusText: response.statusText,
        errorText: errorText,
        url: url
      })
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
  // IMMEDIATE logging - this should show in Vercel logs for ANY request
  console.log('🚨 WEBHOOK HIT!', new Date().toISOString(), 'URL:', request.url)
  
  const requestId = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`)
  const logger = createLogger({ requestId })
  const startTime = Date.now()
  
  // Capture ALL headers immediately
  const allHeaders: Record<string, string> = {}
  request.headers.forEach((value, key) => {
    allHeaders[key] = value
  })
  
  // Extract IP and user agent immediately
  const userAgent = request.headers.get('user-agent') || ''
  const ipAddress = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   request.headers.get('x-vercel-ip') || 
                   'unknown'
  
  let webhookLogId: string | null = null
  let rawBody = ''
  let parsedPayload: any = null
  
  try {
    console.log('🔍 Processing webhook request:', requestId)
    const debug = (new URL(request.url)).searchParams.get('debug') === '1' || process.env.WEBHOOK_DEBUG === '1'
    
    logger.log('FULL REQUEST HEADERS', allHeaders)
    
    const headersToLog = ['user-agent', 'x-forwarded-for', 'x-real-ip', 'x-vercel-ip-country', 'content-type', 'authorization', 'x-ghl-signature']
    const headerMeta: Record<string, string> = {}
    headersToLog.forEach(h => {
      const v = request.headers.get(h)
      if (v) headerMeta[h] = v
    })
    logger.log('POST /api/webhooks received', headerMeta)

    // Read raw body for GHL marketplace webhooks
    rawBody = await request.text()
    logger.log('raw body received', { length: rawBody.length, preview: rawBody.substring(0, 200) })
    
    // Try to parse JSON
    try {
      parsedPayload = JSON.parse(rawBody)
    } catch (parseError) {
      // Not valid JSON - that's fine, we'll log it anyway
      logger.log('Failed to parse JSON body', { error: parseError instanceof Error ? parseError.message : String(parseError) })
    }
    
    // IMMEDIATELY LOG TO DATABASE - BEFORE ANY PROCESSING
    const webhookLogData = {
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
      user_agent: userAgent,
      ip_address: ipAddress,
      headers: allHeaders,
      raw_body: rawBody,
      parsed_body: parsedPayload,
      body_length: rawBody.length,
      request_id: requestId,
      processing_status: 'received',
      webhook_type: parsedPayload?.type || null,
      location_id: parsedPayload?.locationId || null,
      metadata: {
        hasValidJson: !!parsedPayload,
        contentType: request.headers.get('content-type'),
        userAgent: userAgent,
        ipAddress: ipAddress
      }
    }
    
         // Insert webhook log (fire and forget - don't let this block processing)
     supabaseService.from('webhook_logs').insert(webhookLogData).then(({ data, error }) => {
       if (error) {
         console.error('Failed to log webhook:', error)
       } else {
         console.log('✅ Webhook logged to database')
       }
     })
    
    // Continue with existing processing if we have valid JSON
    if (!parsedPayload) {
      logger.log('No valid JSON payload - ending processing')
      return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 })
    }
    
         logger.log('parsed payload FULL', parsedPayload)
    logger.log('request payload summary', { 
      event: parsedPayload.event, 
      type: parsedPayload.type, 
      locationId: parsedPayload.locationId,
      calendarId: parsedPayload.calendarId,
      appointmentId: parsedPayload.id || parsedPayload.appointmentId,
      keys: Object.keys(parsedPayload || {}) 
    })

    // Handle INSTALL webhooks
    if (parsedPayload.type === 'INSTALL') {
      const res = await handleInstallWebhook(parsedPayload, logger)
      return NextResponse.json(res.body, { status: res.status })
    }

    const kind = detectKind(parsedPayload, logger)
    if (kind === 'appointment') {
      const res = await handleAppointment(parsedPayload, logger)
      const body = { ...res.body, ...(debug ? { logs: logger.dump() } : {}) }
      return NextResponse.json(body, { status: res.status })
    }
    if (kind === 'dial') {
      const res = await handleDial(parsedPayload, logger)
      const body = { ...res.body, ...(debug ? { logs: logger.dump() } : {}) }
      return NextResponse.json(body, { status: res.status })
    }
    if (kind === 'inboundMessage') {
      const res = await handleInboundMessage(parsedPayload, logger)
      const body = { ...res.body, ...(debug ? { logs: logger.dump() } : {}) }
      return NextResponse.json(body, { status: res.status })
    }

    // Log unknown events for debugging
    logger.log('Unknown webhook event', { event: parsedPayload.event, type: parsedPayload.type })
    const body = { success: true, message: 'Event received but not handled', ...(debug ? { logs: logger.dump() } : {}) }
    return NextResponse.json(body, { status: 200 })
    
  } catch (error: any) {
    console.log('🚨 WEBHOOK ERROR!', new Date().toISOString(), 'Error:', error?.message || String(error))
    logger.log('POST /api/webhooks exception', { message: error?.message || String(error) })
    const body = { success: false, error: 'Invalid JSON or server error', logs: logger.dump() }
    return NextResponse.json(body, { status: 500 })
  } finally {
    console.log('🏁 WEBHOOK COMPLETE!', new Date().toISOString())
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