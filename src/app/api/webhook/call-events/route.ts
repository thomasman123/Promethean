import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Store webhook IDs to prevent replay attacks
const processedWebhookIds = new Set<string>();

export async function POST(request: NextRequest) {
  console.log('📞 Received GHL webhook at /api/webhook/call-events');
  
  try {
    // Log all headers for debugging
    const allHeaders: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      allHeaders[key] = value;
    });
    console.log('🔍 All webhook headers:', allHeaders);
    
    // Get the raw body and headers
    const body = await request.text();
    const signature = request.headers.get('x-wh-signature');
    const timestamp = request.headers.get('x-timestamp');
    const contentType = request.headers.get('content-type');
    const userAgent = request.headers.get('user-agent');
    
    console.log('📊 Webhook details:', {
      signature: signature ? 'present' : 'missing',
      timestamp: timestamp ? 'present' : 'missing',
      contentType: contentType || 'missing',
      userAgent: userAgent || 'missing',
      bodyLength: body.length,
      method: request.method,
      url: request.url
    });
    
    // Validate content type
    if (contentType && !contentType.includes('application/json')) {
      console.warn('⚠️ Unexpected content-type:', contentType);
    }
    
    // Parse the payload
    let payload: any;
    try {
      payload = JSON.parse(body);
    } catch (parseError) {
      console.error('Failed to parse webhook payload:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }
    
    console.log('Webhook payload:', {
      type: payload.type,
      messageType: payload.messageType,
      locationId: payload.locationId,
      timestamp: payload.timestamp || payload.dateAdded
    });
    
    // Basic validation
    if (!signature) {
      console.warn('Missing webhook signature, skipping verification in development');
      // In production, you should return 401 here
      // return NextResponse.json({ error: 'Missing webhook signature' }, { status: 401 });
    }
    
    // TODO: Verify signature if present (implement GHL signature verification)
    
    // Check for replay attack prevention
    const webhookId = payload.webhookId || payload.messageId;
    if (webhookId && processedWebhookIds.has(webhookId)) {
      console.log('Duplicate webhook ID detected, ignoring:', webhookId);
      return NextResponse.json({ message: 'Webhook already processed' });
    }
    
    // Validate timestamp if present
    const webhookTimestamp = payload.timestamp || payload.dateAdded;
    if (webhookTimestamp && !isTimestampValid(webhookTimestamp)) {
      console.warn('Webhook timestamp is outside acceptable window:', webhookTimestamp);
      // In production, you might want to reject old webhooks
      // return NextResponse.json({ error: 'Webhook timestamp is too old' }, { status: 400 });
    }
    
    // Process OutboundMessage webhooks for phone calls
    if (payload.type === 'OutboundMessage' && payload.messageType === 'CALL') {
      console.log('🎯 Processing phone call webhook');
      
      try {
        await processPhoneCallWebhook(payload);
        
        // Add webhook ID to processed set
        if (webhookId) {
          processedWebhookIds.add(webhookId);
          // Clean up old webhook IDs periodically (keep last 1000)
          if (processedWebhookIds.size > 1000) {
            const idsArray = Array.from(processedWebhookIds);
            const toKeep = idsArray.slice(-800); // Keep last 800
            processedWebhookIds.clear();
            toKeep.forEach(id => processedWebhookIds.add(id));
          }
        }
        
        console.log('✅ Phone call webhook processed successfully');
        return NextResponse.json({ message: 'Phone call webhook processed successfully' });
        
      } catch (error) {
        console.error('Failed to process phone call webhook:', error);
        return NextResponse.json(
          { error: 'Failed to process phone call webhook' },
          { status: 500 }
        );
      }
    } 
    // Process AppointmentCreate webhooks
    else if (payload.type === 'AppointmentCreate') {
      console.log('📅 Processing appointment creation webhook');
      
      try {
        await processAppointmentWebhook(payload);
        
        // Add webhook ID to processed set
        if (webhookId) {
          processedWebhookIds.add(webhookId);
          // Clean up old webhook IDs periodically (keep last 1000)
          if (processedWebhookIds.size > 1000) {
            const idsArray = Array.from(processedWebhookIds);
            const toKeep = idsArray.slice(-800); // Keep last 800
            processedWebhookIds.clear();
            toKeep.forEach(id => processedWebhookIds.add(id));
          }
        }
        
        console.log('✅ Appointment webhook processed successfully');
        return NextResponse.json({ message: 'Appointment webhook processed successfully' });
        
      } catch (error) {
        console.error('Failed to process appointment webhook:', error);
        return NextResponse.json(
          { error: 'Failed to process appointment webhook' },
          { status: 500 }
        );
      }
    }
    // Process AppointmentUpdate webhooks
    else if (payload.type === 'AppointmentUpdate') {
      console.log('📝 Processing appointment update webhook');
      
      try {
        await processAppointmentUpdateWebhook(payload);
        
        // Add webhook ID to processed set
        if (webhookId) {
          processedWebhookIds.add(webhookId);
          // Clean up old webhook IDs periodically (keep last 1000)
          if (processedWebhookIds.size > 1000) {
            const idsArray = Array.from(processedWebhookIds);
            const toKeep = idsArray.slice(-800); // Keep last 800
            processedWebhookIds.clear();
            toKeep.forEach(id => processedWebhookIds.add(id));
          }
        }
        
        console.log('✅ Appointment update webhook processed successfully');
        return NextResponse.json({ message: 'Appointment update webhook processed successfully' });
        
      } catch (error) {
        console.error('Failed to process appointment update webhook:', error);
        return NextResponse.json(
          { error: 'Failed to process appointment update webhook' },
          { status: 500 }
        );
      }
    }
    // Process AppointmentDelete webhooks
    else if (payload.type === 'AppointmentDelete') {
      console.log('🗑️ Processing appointment deletion webhook');
      
      try {
        await processAppointmentDeleteWebhook(payload);
        
        // Add webhook ID to processed set
        if (webhookId) {
          processedWebhookIds.add(webhookId);
          // Clean up old webhook IDs periodically (keep last 1000)
          if (processedWebhookIds.size > 1000) {
            const idsArray = Array.from(processedWebhookIds);
            const toKeep = idsArray.slice(-800); // Keep last 800
            processedWebhookIds.clear();
            toKeep.forEach(id => processedWebhookIds.add(id));
          }
        }
        
        console.log('✅ Appointment deletion webhook processed successfully');
        return NextResponse.json({ message: 'Appointment deletion webhook processed successfully' });
        
      } catch (error) {
        console.error('Failed to process appointment deletion webhook:', error);
        return NextResponse.json(
          { error: 'Failed to process appointment deletion webhook' },
          { status: 500 }
        );
      }
    } else {
      console.log('📋 Non-supported webhook received:', {
        type: payload.type,
        messageType: payload.messageType
      });
      return NextResponse.json({ message: 'Webhook received but not supported' });
    }
    
  } catch (error) {
    console.error('GHL webhook processing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Import the processing functions from our main webhook route
async function processPhoneCallWebhook(payload: any) {
  console.log('🔄 Processing phone call data:', {
    messageId: payload.messageId,
    locationId: payload.locationId,
    contactId: payload.contactId,
    callDuration: payload.callDuration,
    callStatus: payload.callStatus,
    direction: payload.direction
  });
  
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, serviceKey);
    
    // Find account by GHL location ID
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id, name, ghl_location_id, ghl_api_key')
      .eq('ghl_location_id', payload.locationId)
      .single();
    
    if (accountError || !account) {
      console.warn('⚠️ Phone call webhook received for unknown location ID:', payload.locationId);
      
      // Try to find and update an account that might match this location
      const recoveredAccount = await tryRecoverLocationId(supabase, payload.locationId);
      if (recoveredAccount) {
        console.log('✅ Successfully recovered location ID for phone call, processing...');
        // Recursively call this function now that we have the location ID set
        return await processPhoneCallWebhook(payload);
      }
      
      console.error('❌ Phone call webhook failed - no matching account found for location:', payload.locationId);
      return;
    }
    
    console.log('📍 Found account:', account.name, '(', account.id, ')');
    
    // Try to find the caller user by fetching from GHL API and matching to platform users
    let callerUserId = null;
    let setterName = null;
    let setterEmail = null;
    
    if (payload.userId && account.ghl_api_key) {
      try {
        console.log('🔍 Fetching user details from GHL for userId:', payload.userId);
        
        // Fetch user from GHL API
        const userResponse = await fetch(`https://services.leadconnectorhq.com/users/${payload.userId}`, {
          headers: {
            'Authorization': `Bearer ${account.ghl_api_key}`,
            'Version': '2021-07-28',
          },
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setterName = userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
          setterEmail = userData.email || null;
          
          console.log('✅ Successfully fetched user data:', {
            name: setterName,
            email: setterEmail,
            phone: userData.phone
          });
          
          // Try to match to existing platform user by email
          if (userData.email) {
            const { data: platformUser } = await supabase
              .from('users')
              .select('id')
              .eq('account_id', account.id)
              .eq('email', userData.email)
              .single();
            
            callerUserId = platformUser?.id || null;
            
            if (callerUserId) {
              console.log('✅ Matched GHL user to platform user:', callerUserId);
            } else {
              console.log('⚠️ GHL user not found in platform users table');
            }
          }
        } else {
          console.log('⚠️ User not found in GHL API');
        }
      } catch (error) {
        console.error('❌ Error fetching user from GHL:', error);
      }
    }
    
    // Get contact information by fetching from GHL API
    let contactName = null;
    let contactEmail = null;
    let contactPhone = null;
    // Attribution and contact source from contact
    let dialAttrSource: any = null;
    let dialLastAttrSource: any = null;
    let contactSource: string | null = null;
    
    if (payload.contactId && account.ghl_api_key) {
      try {
        console.log('🔍 Fetching contact details from GHL for contactId:', payload.contactId);
        
        const contactResponse = await fetch(`https://services.leadconnectorhq.com/contacts/${payload.contactId}`, {
          headers: {
            'Authorization': `Bearer ${account.ghl_api_key}`,
            'Version': '2021-07-28',
          },
        });
        
        if (contactResponse.ok) {
          const contactData = await contactResponse.json();
          contactName = contactData.name || 
                       (contactData.firstName && contactData.lastName ? 
                        `${contactData.firstName} ${contactData.lastName}`.trim() : 
                        contactData.firstName || contactData.lastName) || null;
          contactEmail = contactData.email || null;
          contactPhone = contactData.phone || null;
          // capture attribution and source
          dialAttrSource = contactData.attributionSource || null;
          dialLastAttrSource = contactData.lastAttributionSource || null;
          contactSource = contactData.source || null;
          
          console.log('✅ Successfully fetched contact data:', {
            name: contactName,
            email: contactEmail,
            phone: contactPhone
          });
        } else {
          console.log('⚠️ Contact not found in GHL API');
        }
      } catch (error) {
        console.error('❌ Error fetching contact from GHL:', error);
      }
    }
    
    // Prepare dial data (mapped to existing dials schema)
    const contactAttribution = dialAttrSource || dialLastAttrSource || {};
    const attributionSource = dialAttrSource || null;
    const lastAttributionSource = dialLastAttrSource || null;

    let classifiedAttribution: any = null;
    try {
      if (contactAttribution && (contactAttribution.utmSource || contactAttribution.utmMedium || contactAttribution.campaign || contactAttribution.referrer || contactAttribution.gclid || contactAttribution.fbclid)) {
        const { data: attributionResult, error: attributionError } = await supabase
          .rpc('classify_contact_attribution' as any, {
            p_utm_source: contactAttribution.utmSource || null,
            p_utm_medium: contactAttribution.utmMedium || null,
            p_utm_campaign: contactAttribution.campaign || null,
            p_referrer: contactAttribution.referrer || null,
            p_gclid: contactAttribution.gclid || null,
            p_fbclid: contactAttribution.fbclid || null,
          });
        if (!attributionError) {
          classifiedAttribution = attributionResult;
        }
      }
    } catch {}

    let enhancedClassification: any = null;
    try {
      if (attributionSource) {
        const { data: enhancedResult, error: enhancedError } = await supabase
          .rpc('classify_enhanced_attribution' as any, {
            p_utm_source: attributionSource.utmSource || null,
            p_utm_medium: attributionSource.utmMedium || null,
            p_utm_campaign: attributionSource.campaign || null,
            p_session_source: attributionSource.sessionSource || null,
            p_fbclid: attributionSource.fbclid || null,
            p_landing_url: attributionSource.url || null
          });
        if (!enhancedError) {
          enhancedClassification = enhancedResult;
        }
      }
    } catch {}

    const dialData = {
      account_id: account.id,
      contact_name: contactName || 'Unknown',
      email: contactEmail,
      phone: contactPhone || '',
      setter: setterName || 'Unknown',
      duration: payload.callDuration || 0,
      call_recording_link: payload.attachments?.[0] || null,
      answered: payload.callDuration > 30 && payload.status === 'completed' && payload.callStatus !== 'voicemail',
      meaningful_conversation: payload.callDuration > 120 && payload.status === 'completed' && payload.callStatus !== 'voicemail',
      date_called: new Date(payload.timestamp || payload.dateAdded || new Date().toISOString()).toISOString(),

      // Attribution mirrors
      contact_source: contactSource,
      contact_utm_source: contactAttribution?.utmSource || null,
      contact_utm_medium: contactAttribution?.utmMedium || null,
      contact_utm_campaign: contactAttribution?.campaign || null,
      contact_utm_content: contactAttribution?.utmContent || null,
      contact_referrer: contactAttribution?.referrer || null,
      contact_gclid: contactAttribution?.gclid || null,
      contact_fbclid: contactAttribution?.fbclid || null,
      contact_campaign_id: contactAttribution?.campaignId || null,
      last_attribution_source: classifiedAttribution ? JSON.stringify(classifiedAttribution) : null,

      utm_source: attributionSource?.utmSource || null,
      utm_medium: attributionSource?.utmMedium || null,
      utm_campaign: attributionSource?.campaign || null,
      utm_content: attributionSource?.utmContent || null,
      utm_term: attributionSource?.utmTerm || null,
      utm_id: attributionSource?.utm_id || null,
      fbclid: attributionSource?.fbclid || null,
      fbc: attributionSource?.fbc || null,
      fbp: attributionSource?.fbp || null,
      landing_url: attributionSource?.url || null,
      session_source: attributionSource?.sessionSource || null,
      medium_id: attributionSource?.mediumId || null,
      user_agent: attributionSource?.userAgent || null,
      ip_address: attributionSource?.ip || null,
      attribution_data: attributionSource ? JSON.stringify(attributionSource) : null,
      last_attribution_data: lastAttributionSource ? JSON.stringify(lastAttributionSource) : null,
    };
    
    console.log('💾 Saving dial data:', {
      ...dialData,
      setter_info: setterName ? { name: setterName, email: setterEmail } : null
    });
    
    // Save to dials table
    const { data: savedDial, error: dialError } = await supabase
      .from('dials')
      .insert(dialData)
      .select()
      .single();
    
    if (dialError) {
      console.error('Failed to save dial:', dialError);
      throw dialError;
    }
    
    console.log('✅ Dial saved successfully:', savedDial.id);
    
    // New: If the appointment already exists (dial arrived after appointment), link it here
    try {
      const dialTimeIso = dialData.date_called;
      if (dialTimeIso) {
        const dialTime = new Date(dialTimeIso);
        const windowEnd = new Date(dialTime.getTime() + 60 * 60 * 1000); // 60 minutes after dial

        let apptQuery = supabase
          .from('appointments')
          .select('id, date_booked, contact_name, email, phone')
          .eq('account_id', account.id)
          .gte('date_booked', dialTime.toISOString())
          .lte('date_booked', windowEnd.toISOString())
          .order('date_booked', { ascending: true })
          .limit(1);

        if (dialData.email) {
          apptQuery = apptQuery.eq('email', dialData.email);
        } else if (dialData.phone) {
          apptQuery = apptQuery.eq('phone', dialData.phone);
        }

        const { data: appts, error: apptErr } = await apptQuery;
        if (apptErr) {
          console.error('Error searching appointments to link dial:', apptErr);
        } else if (appts && appts.length > 0) {
          const appt = appts[0];
          const { error: updErr } = await supabase
            .from('dials')
            .update({ 
              booked: true, 
              booked_appointment_id: appt.id,
              contact_name: dialData.contact_name || appt.contact_name || 'Unknown',
              email: dialData.email || appt.email || null,
              phone: dialData.phone || appt.phone || ''
            })
            .eq('id', savedDial.id);
          if (updErr) {
            console.error('Failed to mark dial as booked/link appointment (dial-first path):', updErr);
          } else {
            console.log('🔗 Linked dial to existing appointment (dial-first path):', { dialId: savedDial.id, appointmentId: appt.id });
          }
        } else {
          console.log('ℹ️ No appointment found within 60 minutes after dial for linking');
        }
      }
    } catch (e) {
      console.error('Error linking dial to appointment (dial-first path):', e);
    }
    
  } catch (error) {
    console.error('Error processing phone call webhook:', error);
    throw error;
  }
}

async function processAppointmentWebhook(payload: any) {
  console.log('🔄 Processing appointment webhook:', {
    appointmentId: payload.appointment?.id,
    locationId: payload.locationId,
    calendarId: payload.appointment?.calendarId,
    title: payload.appointment?.title,
    startTime: payload.appointment?.startTime,
    contactId: payload.appointment?.contactId,
    assignedUserId: payload.appointment?.assignedUserId
  });
  
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, serviceKey);
    
    // Find account by GHL location ID
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id, name, ghl_location_id, ghl_api_key, ghl_refresh_token')
      .eq('ghl_location_id', payload.locationId)
      .single();
    
    if (accountError || !account) {
      console.warn('⚠️ Webhook received for unknown location ID:', payload.locationId);
      
      // Try to find and update an account that might match this location
      const recoveredAccount = await tryRecoverLocationId(supabase, payload.locationId);
      if (recoveredAccount) {
        console.log('✅ Successfully recovered and updated location ID for account:', recoveredAccount.name);
        // Recursively call this function now that we have the location ID set
        return await processAppointmentWebhook(payload);
      }
      
      // Log helpful debugging info
      const { data: allAccounts } = await supabase
        .from('accounts')
        .select('id, name, ghl_location_id, ghl_auth_type')
        .eq('ghl_auth_type', 'oauth2');
      
      console.error('🚨 Location ID Recovery Failed', {
        webhookLocationId: payload.locationId,
        availableAccounts: allAccounts?.map(a => ({
          name: a.name,
          id: a.id,
          storedLocationId: a.ghl_location_id || 'none'
        })) || [],
        solution: 'Please reconnect GHL OAuth in Account → CRM Connection'
      });
      
      return;
    }
    
    console.log('📍 Found account:', account.name, '(', account.id, ')');
    
    // Check if this appointment's calendar is mapped
    const { data: calendarMapping, error: mappingError } = await supabase
      .from('calendar_mappings')
      .select('*')
      .eq('account_id', account.id)
      .eq('ghl_calendar_id', payload.appointment?.calendarId)
      .single();
    
    if (mappingError || !calendarMapping) {
      console.log('📋 Calendar not mapped for appointment, skipping:', {
        calendarId: payload.appointment?.calendarId,
        appointmentId: payload.appointment?.id
      });
      return;
    }
    
    console.log('✅ Calendar mapping found:', {
      calendarId: calendarMapping.ghl_calendar_id,
      targetTable: calendarMapping.target_table,
      calendarName: calendarMapping.ghl_calendar_name
    });
    
    // Enhanced API enrichment for appointments table only
    let fullAppointmentData = null;
    let contactData = null;
    let salesRepData = null;
    let setterData = null;
    
    if (calendarMapping.target_table === 'appointments' && payload.appointment?.id && account.ghl_api_key) {
      try {
        // 1. Get full appointment details from API
        console.log('📅 Fetching full appointment details for ID:', payload.appointment.id);
        
        const appointmentResponse = await fetch(`https://services.leadconnectorhq.com/calendars/events/appointments/${payload.appointment.id}`, {
          headers: {
            'Authorization': `Bearer ${account.ghl_api_key}`,
            'Version': '2021-07-28',
          },
        });
        
        if (appointmentResponse.ok) {
          const appointmentApiData = await appointmentResponse.json();
          console.log('🔍 Raw appointment API response:', JSON.stringify(appointmentApiData, null, 2));
          
          fullAppointmentData = appointmentApiData.appointment; // API returns data under 'appointment' key
          console.log('📅 Full appointment data retrieved:', {
            id: fullAppointmentData?.id,
            title: fullAppointmentData?.title,
            status: fullAppointmentData?.appointmentStatus,
            startTime: fullAppointmentData?.startTime,
            contactId: fullAppointmentData?.contactId,
            assignedUserId: fullAppointmentData?.assignedUserId,
            createdBy: fullAppointmentData?.createdBy,
            source: fullAppointmentData?.source,
            extractedSource: fullAppointmentData?.createdBy?.source || fullAppointmentData?.source || 'unknown'
          });
        } else {
          const errorText = await appointmentResponse.text();
          console.error('Failed to fetch appointment details:', {
            status: appointmentResponse.status,
            statusText: appointmentResponse.statusText,
            error: errorText,
            appointmentId: payload.appointment.id
          });
        }
        
        // 2. Get contact details if contactId exists
        const contactId = fullAppointmentData?.contactId || payload.appointment?.contactId;
        if (contactId) {
          console.log('👤 Fetching contact details for ID:', contactId);
          
          const contactResponse = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}`, {
            headers: {
              'Authorization': `Bearer ${account.ghl_api_key}`,
              'Version': '2021-07-28',
            },
          });
          
          if (contactResponse.ok) {
            const contactApiData = await contactResponse.json();
            contactData = contactApiData.contact;
            console.log('👤 Contact data retrieved:', {
              name: contactData?.name,
              firstName: contactData?.firstName,
              lastName: contactData?.lastName,
              email: contactData?.email,
              phone: contactData?.phone,
              companyName: contactData?.companyName,
              tags: contactData?.tags,
              source: contactData?.source,
              attributionSource: contactData?.attributionSource,
              lastAttributionSource: contactData?.lastAttributionSource
            });
          } else {
            const errorText = await contactResponse.text();
            console.error('Failed to fetch contact details:', {
              status: contactResponse.status,
              statusText: contactResponse.statusText,
              error: errorText,
              contactId: contactId
            });
          }
        }
        
        // 3. Get setter (createdBy.userId) details
        const setterId = fullAppointmentData?.createdBy?.userId;
        console.log('🔍 Setter ID extraction debug:', {
          fullAppointmentData: !!fullAppointmentData,
          createdBy: fullAppointmentData?.createdBy,
          setterId: setterId
        });
        
        if (setterId) {
          console.log('👨‍🎯 Fetching setter details for ID:', setterId);
          
          const setterResponse = await fetch(`https://services.leadconnectorhq.com/users/${setterId}`, {
            headers: {
              'Authorization': `Bearer ${account.ghl_api_key}`,
              'Version': '2021-07-28',
            },
          });
          
          if (setterResponse.ok) {
            setterData = await setterResponse.json();
            console.log('👨‍🎯 Setter data retrieved:', {
              name: setterData?.name,
              email: setterData?.email,
              firstName: setterData?.firstName,
              lastName: setterData?.lastName
            });
          } else {
            const errorText = await setterResponse.text();
            console.error('Failed to fetch setter details:', {
              status: setterResponse.status,
              statusText: setterResponse.statusText,
              error: errorText,
              userId: setterId
            });
          }
        }
        
        // 4. Get sales rep (assignedUserId) details
        const salesRepId = fullAppointmentData?.assignedUserId || payload.appointment?.assignedUserId;
        if (salesRepId) {
          console.log('👨‍💼 Fetching sales rep details for ID:', salesRepId);
          
          const salesRepResponse = await fetch(`https://services.leadconnectorhq.com/users/${salesRepId}`, {
            headers: {
              'Authorization': `Bearer ${account.ghl_api_key}`,
              'Version': '2021-07-28',
            },
          });
          
          if (salesRepResponse.ok) {
            salesRepData = await salesRepResponse.json();
            console.log('👨‍💼 Sales rep data retrieved:', {
              name: salesRepData?.name,
              email: salesRepData?.email,
              firstName: salesRepData?.firstName,
              lastName: salesRepData?.lastName
            });
          } else {
            const errorText = await salesRepResponse.text();
            console.error('Failed to fetch sales rep details:', {
              status: salesRepResponse.status,
              statusText: salesRepResponse.statusText,
              error: errorText,
              userId: salesRepId
            });
          }
        }
        
      } catch (error) {
        console.error('Error during appointment enrichment:', error);
      }
    } else if (calendarMapping.target_table !== 'appointments') {
      // For discoveries and other tables, do full enrichment including setter data
      try {
        // 1. Fetch full appointment details to get createdBy info
        console.log('📅 Fetching full appointment details for ID:', payload.appointment.id);
        
        const appointmentResponse = await fetch(`https://services.leadconnectorhq.com/calendars/events/appointments/${payload.appointment.id}`, {
          headers: {
            'Authorization': `Bearer ${account.ghl_api_key}`,
            'Version': '2021-07-28',
          },
        });
        
        if (appointmentResponse.ok) {
          const appointmentApiResponse = await appointmentResponse.json();
          fullAppointmentData = appointmentApiResponse.appointment;
          console.log('🔍 Raw appointment API response:', JSON.stringify(appointmentApiResponse, null, 2));
        }
        
        // 2. Enrich with contact data if contactId exists
        if (payload.appointment?.contactId && account.ghl_api_key) {
          console.log('👤 Fetching contact details for ID:', payload.appointment.contactId);
          
          const contactResponse = await fetch(`https://services.leadconnectorhq.com/contacts/${payload.appointment.contactId}`, {
            headers: {
              'Authorization': `Bearer ${account.ghl_api_key}`,
              'Version': '2021-07-28',
            },
          });
          
          if (contactResponse.ok) {
            const contactApiData = await contactResponse.json();
            contactData = contactApiData.contact;
            console.log('👤 Contact data retrieved:', {
              name: contactData?.name,
              firstName: contactData?.firstName,
              lastName: contactData?.lastName,
              email: contactData?.email,
              phone: contactData?.phone,
              companyName: contactData?.companyName,
              tags: contactData?.tags,
              source: contactData?.source,
              attributionSource: contactData?.attributionSource,
              lastAttributionSource: contactData?.lastAttributionSource
            });
          }
        }
        
        // 3. Get setter (createdBy.userId) details - CRITICAL for discoveries!
        const setterId = fullAppointmentData?.createdBy?.userId;
        console.log('🔍 Setter ID extraction debug:', {
          fullAppointmentData: !!fullAppointmentData,
          createdBy: fullAppointmentData?.createdBy,
          setterId: setterId
        });
        
        if (setterId) {
          console.log('👨‍🎯 Fetching setter details for ID:', setterId);
          
          const setterResponse = await fetch(`https://services.leadconnectorhq.com/users/${setterId}`, {
            headers: {
              'Authorization': `Bearer ${account.ghl_api_key}`,
              'Version': '2021-07-28',
            },
          });
          
          if (setterResponse.ok) {
            setterData = await setterResponse.json();
            console.log('👨‍🎯 Setter data retrieved:', {
              name: setterData?.name,
              email: setterData?.email,
              firstName: setterData?.firstName,
              lastName: setterData?.lastName
            });
          } else {
            const errorText = await setterResponse.text();
            console.error('Failed to fetch setter details:', {
              status: setterResponse.status,
              statusText: setterResponse.statusText,
              error: errorText,
              userId: setterId
            });
          }
        }
        
        // 4. Get sales rep (assignedUserId) details
        const salesRepId = fullAppointmentData?.assignedUserId || payload.appointment?.assignedUserId;
        if (salesRepId) {
          console.log('👨‍💼 Fetching sales rep details for ID:', salesRepId);
          
          const salesRepResponse = await fetch(`https://services.leadconnectorhq.com/users/${salesRepId}`, {
            headers: {
              'Authorization': `Bearer ${account.ghl_api_key}`,
              'Version': '2021-07-28',
            },
          });
          
          if (salesRepResponse.ok) {
            salesRepData = await salesRepResponse.json();
            console.log('👨‍💼 Sales rep data retrieved:', {
              name: salesRepData?.name,
              email: salesRepData?.email,
              firstName: salesRepData?.firstName,
              lastName: salesRepData?.lastName
            });
          } else {
            const errorText = await salesRepResponse.text();
            console.error('Failed to fetch sales rep details:', {
              status: salesRepResponse.status,
              statusText: salesRepResponse.statusText,
              error: errorText,
              userId: salesRepId
            });
          }
        }
        
      } catch (error) {
        console.error('Error during discovery enrichment:', error);
      }
    }

    // Setter is determined directly from API createdBy.userId (setterData)
    // No need to search dials - API provides the actual setter information
     
    // Map sales rep to internal user ID
    let salesRepId = null;
    if (salesRepData?.email) {
      const { data: existingSalesRep } = await supabase
        .from('users')
        .select('id')
        .eq('account_id', account.id)
        .eq('email', salesRepData.email)
        .single();
      salesRepId = existingSalesRep?.id || null;
      
      if (salesRepId) {
        console.log('✅ Mapped sales rep to internal user:', salesRepId);
      } else {
        console.log('⚠️ Sales rep not found in internal users - they would need to be manually invited');
      }
    }
    
    // Helper function to convert time to UTC
    const convertToUTC = (timeString: string): string => {
      try {
        return new Date(timeString).toISOString();
      } catch (error) {
        console.error('Failed to convert time to UTC:', timeString, error);
        return new Date().toISOString(); // Fallback to current time
      }
    };
    
    // Create base appointment data with enhanced mapping
    const getContactName = () => {
      if (contactData?.name) return contactData.name;
      if (contactData?.firstName || contactData?.lastName) {
        return `${contactData.firstName || ''} ${contactData.lastName || ''}`.trim();
      }
      return fullAppointmentData?.title || payload.appointment?.title || 'Unknown Contact';
    };

    const getSetterName = () => {
      console.log('🔍 getSetterName debug:', {
        setterData: setterData,
        hasSetterData: !!setterData,
        setterName: setterData?.name,
        setterFirstName: setterData?.firstName,
        setterLastName: setterData?.lastName,
        setterIdFromAppointment: fullAppointmentData?.createdBy?.userId,
        targetTable: calendarMapping.target_table,
        salesRepData: salesRepData,
        salesRepName: salesRepData?.name
      });
      
      // For discoveries, the "setter" is actually the appointment owner (sales rep from appointments perspective)
      if (calendarMapping.target_table === 'discoveries') {
        if (salesRepData?.name) return salesRepData.name;
        if (salesRepData?.firstName || salesRepData?.lastName) {
          return `${salesRepData.firstName || ''} ${salesRepData.lastName || ''}`.trim();
        }
        
        // If we have a sales rep ID but couldn't fetch user data, use a fallback name
        const salesRepId = fullAppointmentData?.assignedUserId || payload.appointment?.assignedUserId;
        if (salesRepId) {
          console.log('⚠️ Sales rep ID found but user data fetch failed, using ID-based fallback');
          return `User ${salesRepId.slice(-8)}`; // Use last 8 chars of ID as identifier
        }
        
        console.log('⚠️ No sales rep data available for discovery setter, falling back to Webhook');
        return 'Webhook';
      }
      
      // For appointments, use the original setter logic (createdBy)
      if (setterData?.name) return setterData.name;
      if (setterData?.firstName || setterData?.lastName) {
        return `${setterData.firstName || ''} ${setterData.lastName || ''}`.trim();
      }
      
      // If we have a setter ID but couldn't fetch user data, use a fallback name
      const setterId = fullAppointmentData?.createdBy?.userId;
      if (setterId) {
        console.log('⚠️ Setter ID found but user data fetch failed, using ID-based fallback');
        return `User ${setterId.slice(-8)}`; // Use last 8 chars of ID as identifier
      }
      
      console.log('⚠️ No setter data available, falling back to Webhook');
      return 'Webhook';
    };

    const getSalesRepName = () => {
      // For discoveries, the "sales rep" is actually the setter (createdBy from appointments perspective)
      if (calendarMapping.target_table === 'discoveries') {
        if (setterData?.name) return setterData.name;
        if (setterData?.firstName || setterData?.lastName) {
          return `${setterData.firstName || ''} ${setterData.lastName || ''}`.trim();
        }
        
        // If we have a setter ID but couldn't fetch user data, use a fallback name
        const setterId = fullAppointmentData?.createdBy?.userId;
        if (setterId) {
          return `User ${setterId.slice(-8)}`; // Use last 8 chars of ID as identifier
        }
        
        return 'Webhook'; // Fallback for discoveries
      }
      
      // For appointments, use the original sales rep logic (assignedUserId)
      if (salesRepData?.name) return salesRepData.name;
      if (salesRepData?.firstName || salesRepData?.lastName) {
        return `${salesRepData.firstName || ''} ${salesRepData.lastName || ''}`.trim();
      }
      return null;
    };

    // Create base data appropriate for the target table
    const commonData = {
      account_id: account.id,
      contact_name: getContactName(),
      email: contactData?.email || null,
      phone: contactData?.phone || null,
      setter: getSetterName(),
      sales_rep: getSalesRepName(),
      call_outcome: null,
      show_outcome: null,
      lead_quality: null,
    };

    // Add appointment-specific fields only for appointments table
    const baseData = calendarMapping.target_table === 'appointments' ? {
      ...commonData,
      pitched: null,
      watched_assets: null,
      objections: null,
    } : commonData;
    
    // Save to appropriate table based on mapping
    if (calendarMapping.target_table === 'appointments') {
      // Enhanced data mapping for appointments table
      const appointmentStartTime = fullAppointmentData?.startTime || payload.appointment?.startTime;
      const webhookTimestamp = new Date().toISOString(); // When webhook was received
      
      // Create comprehensive metadata
      const metadata = {
        webhook_received_at: webhookTimestamp,
        appointment_api_data: fullAppointmentData ? {
          id: fullAppointmentData.id,
          title: fullAppointmentData.title,
          appointmentStatus: fullAppointmentData.appointmentStatus,
          address: fullAppointmentData.address,
          notes: fullAppointmentData.notes,
          groupId: fullAppointmentData.groupId,
          isRecurring: fullAppointmentData.isRecurring,
          dateAdded: fullAppointmentData.dateAdded,
          dateUpdated: fullAppointmentData.dateUpdated,
          endTime: fullAppointmentData.endTime,
          source: fullAppointmentData.source,
          createdBy: fullAppointmentData.createdBy
        } : null,
        contact_enriched_data: contactData ? {
          id: contactData.id,
          firstName: contactData.firstName,
          lastName: contactData.lastName,
          companyName: contactData.companyName,
          timezone: contactData.timezone,
          tags: contactData.tags,
          website: contactData.website,
          address: {
            address1: contactData.address1,
            city: contactData.city,
            state: contactData.state,
            country: contactData.country,
            postalCode: contactData.postalCode
          },
          attribution: contactData.attributionSource,
          lastActivity: contactData.lastActivity,
          customFields: contactData.customFields
        } : null,
        setter_data: setterData ? {
          id: setterData.id,
          name: setterData.name,
          email: setterData.email,
          firstName: setterData.firstName,
          lastName: setterData.lastName
        } : null,
        sales_rep_data: salesRepData ? {
          id: salesRepData.id,
          name: salesRepData.name,
          email: salesRepData.email,
          firstName: salesRepData.firstName,
          lastName: salesRepData.lastName
        } : null,
        original_webhook_payload: {
          type: payload.type,
          locationId: payload.locationId,
          appointment: payload.appointment
        }
      };

      // Auto-create users for setter and sales rep if they don't exist
      console.log('👥 Auto-creating users for appointment data:', {
        setter: baseData.setter,
        salesRep: baseData.sales_rep,
        setterGhlId: setterData?.id,
        salesRepGhlId: salesRepData?.id
      });

      const { linkExistingUsersToData } = await import('@/lib/auto-user-creation');
      const userIds = await linkExistingUsersToData(
        supabase,
        account.id,
        baseData.setter,
        baseData.sales_rep,
        setterData?.email,
        salesRepData?.email
      );

      console.log('✅ User creation results:', {
        setterUserId: userIds.setterUserId || 'None',
        salesRepUserId: userIds.salesRepUserId || 'None'
      });

      // Process contact attribution data
      const contactAttribution = contactData?.attributionSource || contactData?.lastAttributionSource || {};
      console.log('🎯 Processing contact attribution:', {
        contactSource: contactData?.source,
        attributionSource: contactAttribution,
        hasAttribution: !!contactAttribution
      });

      // Call the classification function
      let classifiedAttribution = null;
      if (contactData) {
        try {
          const { data: attributionResult, error: attributionError } = await supabase
            .rpc('classify_contact_attribution_enhanced', {
              p_contact_source: contactData.source || null,
              p_utm_source: contactAttribution.utmSource || null,
              p_utm_medium: contactAttribution.utmMedium || null,
              p_utm_campaign: contactAttribution.campaign || null,
              p_referrer: contactAttribution.referrer || null,
              p_gclid: contactAttribution.gclid || null,
              p_fbclid: contactAttribution.fbclid || null,
              p_account_id: account.id
            });

          if (attributionError) {
            console.error('Error classifying contact attribution:', attributionError);
          } else {
            classifiedAttribution = attributionResult;
            console.log('✅ Contact attribution classified:', classifiedAttribution);
          }
        } catch (error) {
          console.error('Error calling attribution classification:', error);
        }
      }

      // Enhanced attribution processing
      const attributionSource = contactData?.attributionSource;
      const lastAttributionSource = contactData?.lastAttributionSource;
      
      // Extract custom fields for business intelligence
      const customFields = contactData?.customField || [];
      const leadValue = customFields.find((cf: any) => cf.id === '13n0JVzjarD1UTyiDfNN')?.value || null;
      const leadPath = customFields.find((cf: any) => cf.id === 'vHICYHikZaD4Qjkt7F8K')?.value || null;
      const businessType = customFields.find((cf: any) => cf.id === 'Y1Kj2lNM1o8Hcs7fI7tq')?.value || null;

      // Classify enhanced attribution
      let enhancedClassification = null;
      if (attributionSource) {
        try {
          const { data: enhancedResult, error: enhancedError } = await supabase
            .rpc('classify_enhanced_attribution', {
              p_utm_source: attributionSource.utmSource || null,
              p_utm_medium: attributionSource.utmMedium || null,
              p_utm_campaign: attributionSource.campaign || null,
              p_session_source: attributionSource.sessionSource || null,
              p_fbclid: attributionSource.fbclid || null,
              p_landing_url: attributionSource.url || null
            });

          if (enhancedError) {
            console.error('Error classifying enhanced attribution:', enhancedError);
          } else {
            enhancedClassification = enhancedResult;
            console.log('✅ Enhanced attribution classified:', enhancedClassification);
          }
        } catch (error) {
          console.error('Error calling enhanced attribution classification:', error);
        }
      }

      const appointmentData = {
        ...baseData,
        date_booked: webhookTimestamp, // When appointment was booked (webhook received)
        date_booked_for: appointmentStartTime ? 
          new Date(appointmentStartTime).toISOString() : null, // When appointment is scheduled
        cash_collected: null,
        total_sales_value: null,
        metadata: JSON.stringify(metadata),
        setter_user_id: userIds.setterUserId || null,
        sales_rep_user_id: userIds.salesRepUserId || null,
        setter_ghl_id: setterData?.id || null,
        sales_rep_ghl_id: salesRepData?.id || null,
        ghl_appointment_id: payload.appointment?.id || null,
        ghl_source: fullAppointmentData?.createdBy?.source || fullAppointmentData?.source || 'unknown', // Add GHL source from createdBy.source
        
        // Legacy contact attribution fields (keep for compatibility)
        contact_source: contactData?.source || null,
        contact_utm_source: contactAttribution.utmSource || null,
        contact_utm_medium: contactAttribution.utmMedium || null,
        contact_utm_campaign: contactAttribution.campaign || null,
        contact_utm_content: contactAttribution.utmContent || null,
        contact_referrer: contactAttribution.referrer || null,
        contact_gclid: contactAttribution.gclid || null,
        contact_fbclid: contactAttribution.fbclid || null,
        contact_campaign_id: contactAttribution.campaignId || null,
        last_attribution_source: classifiedAttribution ? JSON.stringify(classifiedAttribution) : null,
        
        // Enhanced attribution fields
        utm_source: attributionSource?.utmSource || null,
        utm_medium: attributionSource?.utmMedium || null,
        utm_campaign: attributionSource?.campaign || null,
        utm_content: attributionSource?.utmContent || null,
        utm_term: attributionSource?.utmTerm || null,
        utm_id: attributionSource?.utm_id || null,
        fbclid: attributionSource?.fbclid || null,
        fbc: attributionSource?.fbc || null,
        fbp: attributionSource?.fbp || null,
        landing_url: attributionSource?.url || null,
        session_source: attributionSource?.sessionSource || null,
        medium_id: attributionSource?.mediumId || null,
        user_agent: attributionSource?.userAgent || null,
        ip_address: attributionSource?.ip || null,
        attribution_data: attributionSource ? JSON.stringify(attributionSource) : null,
        last_attribution_data: lastAttributionSource ? JSON.stringify(lastAttributionSource) : null,
        
        // Business intelligence fields
        lead_value: leadValue,
        lead_path: leadPath,
        business_type: businessType
      };
      
      // Check for existing appointment to prevent duplicates
      // Use GHL appointment ID as primary unique identifier, with fallback to comprehensive matching
      const ghlAppointmentId = payload.appointment?.id;
      
      let duplicateQuery = supabase
        .from('appointments')
        .select('id, ghl_appointment_id, sales_rep_ghl_id, setter_ghl_id')
        .eq('account_id', account.id);
      
      if (ghlAppointmentId) {
        // First check: Look for existing appointment with same GHL ID
        const { data: existingByGhlId } = await supabase
          .from('appointments')
          .select('id, ghl_appointment_id')
          .eq('account_id', account.id)
          .eq('ghl_appointment_id', ghlAppointmentId)
          .maybeSingle();
        
        if (existingByGhlId) {
          console.log('📋 Duplicate appointment detected by GHL ID, skipping:', {
            existingId: existingByGhlId.id,
            ghlAppointmentId: ghlAppointmentId,
            contactName: appointmentData.contact_name,
            scheduledTime: appointmentData.date_booked_for
          });
          return;
        }
      }
      
      // Second check: Comprehensive duplicate detection for appointments without GHL ID
      // Only consider it a duplicate if contact, time, AND either setter or sales rep match
      const { data: existingComprehensive } = await supabase
        .from('appointments')
        .select('id, sales_rep_ghl_id, setter_ghl_id, ghl_appointment_id')
        .eq('account_id', account.id)
        .eq('contact_name', appointmentData.contact_name)
        .eq('date_booked_for', appointmentData.date_booked_for)
        .maybeSingle();
      
      if (existingComprehensive) {
        // Check if this is actually a different appointment with different people
        const sameRep = existingComprehensive.sales_rep_ghl_id === appointmentData.sales_rep_ghl_id;
        const sameSetter = existingComprehensive.setter_ghl_id === appointmentData.setter_ghl_id;
        const hasGhlId = existingComprehensive.ghl_appointment_id;
        
        if ((sameRep || sameSetter) && !hasGhlId) {
          console.log('📋 Duplicate appointment detected by comprehensive matching, skipping:', {
            existingId: existingComprehensive.id,
            contactName: appointmentData.contact_name,
            scheduledTime: appointmentData.date_booked_for,
            reason: sameRep ? 'same sales rep' : 'same setter'
          });
          return;
        } else {
          console.log('✅ Same contact/time but different team members - allowing as separate appointment:', {
            newSalesRep: appointmentData.sales_rep_ghl_id,
            existingSalesRep: existingComprehensive.sales_rep_ghl_id,
            newSetter: appointmentData.setter_ghl_id,
            existingSetter: existingComprehensive.setter_ghl_id
          });
        }
      }

      const { data: savedAppointment, error: saveError } = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select()
        .single();
      
      if (saveError) {
        console.error('Failed to save appointment:', saveError);
        throw new Error(`Failed to save appointment: ${saveError.message}`);
      }
      
      console.log('✅ Appointment saved successfully:', payload.appointment?.id);
      
      // Refresh GHL user roles now that the appointment is saved and activity counts should be accurate
      try {
        console.log('🔄 Refreshing GHL user roles after appointment save...');
        
        if (setterData?.id) {
          await supabase.rpc('update_ghl_user_roles_with_context' as any, {
            p_account_id: account.id,
            p_ghl_user_id: setterData.id,
            p_current_role: 'setter'
          });
          console.log('✅ Refreshed setter role:', setterData.id);
        }
        
        if (salesRepData?.id) {
          await supabase.rpc('update_ghl_user_roles_with_context' as any, {
            p_account_id: account.id,
            p_ghl_user_id: salesRepData.id,
            p_current_role: 'sales_rep'
          });
          console.log('✅ Refreshed sales rep role:', salesRepData.id);
        }
      } catch (refreshError) {
        console.error('⚠️ Failed to refresh GHL user roles (non-critical):', refreshError);
        // Don't throw - this is not critical to appointment processing
      }
      
      // New: Link appointment to most recent qualifying dial (within 60 minutes before booking)
      try {
        const bookedAtIso = appointmentData.date_booked;
        if (bookedAtIso) {
          const bookedAt = new Date(bookedAtIso);
          const windowStart = new Date(bookedAt.getTime() - 60 * 60 * 1000); // 60 minutes prior

          let dialQuery = supabase
            .from('dials')
            .select('id, date_called')
            .eq('account_id', account.id)
            .gte('date_called', windowStart.toISOString())
            .lte('date_called', bookedAt.toISOString())
            .order('date_called', { ascending: false })
            .limit(1);

          if (appointmentData.email) {
            dialQuery = dialQuery.eq('email', appointmentData.email);
          } else if (appointmentData.phone) {
            dialQuery = dialQuery.eq('phone', appointmentData.phone);
          }

          const { data: recent, error: recentErr } = await dialQuery;
          if (recentErr) {
            console.error('Error searching recent dials for linking:', recentErr);
          } else if (recent && recent.length > 0) {
            const dial = recent[0];
            const { error: updateErr } = await supabase
              .from('dials')
              .update({ 
                booked: true, 
                booked_appointment_id: savedAppointment.id,
                contact_name: (dial as any).contact_name || savedAppointment.contact_name || 'Unknown',
                email: (dial as any).email || savedAppointment.email || null,
                phone: (dial as any).phone || savedAppointment.phone || ''
              })
              .eq('id', dial.id);
            if (updateErr) {
              console.error('Failed to mark dial as booked/link appointment:', updateErr);
            } else {
              console.log('🔗 Linked appointment to dial and marked booked:', { dialId: dial.id, appointmentId: savedAppointment.id });
            }
          } else {
            console.log('ℹ️ No qualifying dial found within 60 minutes for this appointment booking');
          }
        }
      } catch (linkErr) {
        console.error('Error linking appointment to dial:', linkErr);
      }

      // Removed old linking mechanism
      // await linkAppointmentToDial(supabase, savedAppointment, contactData, account.id);
      
    } else if (calendarMapping.target_table === 'discoveries') {
      // Auto-create users for discoveries
      // Rule: setter = appointment owner (salesRepData). sales_rep stays blank until a linked appointment is found
      console.log('👥 Auto-creating users for discovery data (setter from appointment owner, sales_rep blank):', {
        setter: baseData.setter,
        setterGhlId: salesRepData?.id,
      });

      const { linkExistingUsersToData } = await import('@/lib/auto-user-creation');
      const userIds = await linkExistingUsersToData(
        supabase,
        account.id,
        baseData.setter, // appointment owner (salesRepData)
        null, // sales_rep unknown at discovery time
        salesRepData?.email,
        null
      );

      console.log('✅ User creation results for discovery:', {
        setterUserId: userIds.setterUserId || 'None',
        salesRepUserId: 'None (deferred until appointment link)'
      });

      // Process contact attribution data for discoveries
      const contactAttribution = contactData?.attributionSource || contactData?.lastAttributionSource || {};
      console.log('🎯 Processing discovery contact attribution:', {
        contactSource: contactData?.source,
        attributionSource: contactAttribution,
        hasAttribution: !!contactAttribution
      });

      // Call the classification function for discoveries
      let classifiedAttribution = null;
      if (contactData) {
        try {
          const { data: attributionResult, error: attributionError } = await supabase
            .rpc('classify_contact_attribution_enhanced', {
              p_contact_source: contactData.source || null,
              p_utm_source: contactAttribution.utmSource || null,
              p_utm_medium: contactAttribution.utmMedium || null,
              p_utm_campaign: contactAttribution.campaign || null,
              p_referrer: contactAttribution.referrer || null,
              p_gclid: contactAttribution.gclid || null,
              p_fbclid: contactAttribution.fbclid || null,
              p_account_id: account.id
            });

          if (attributionError) {
            console.error('Error classifying discovery contact attribution:', attributionError);
          } else {
            classifiedAttribution = attributionResult;
            console.log('✅ Discovery contact attribution classified:', classifiedAttribution);
          }
        } catch (error) {
          console.error('Error calling discovery attribution classification:', error);
        }
      }

      const discoveryData = {
        ...baseData,
        date_booked_for: payload.appointment.startTime ? 
          new Date(payload.appointment.startTime).toISOString() : null,
        setter_user_id: userIds.setterUserId || null, // appointment owner user ID
        sales_rep_user_id: null, // never set from creator at discovery time
        setter_ghl_id: salesRepData?.id || null, // setter from appointment owner
        sales_rep_ghl_id: null, // never set from creator at discovery time
        ghl_appointment_id: payload.appointment?.id || null,
        ghl_source: fullAppointmentData?.createdBy?.source || fullAppointmentData?.source || 'unknown', // Add GHL source from createdBy.source
        // Contact attribution fields for discoveries
        contact_source: contactData?.source || null,
        contact_utm_source: contactAttribution.utmSource || null,
        contact_utm_medium: contactAttribution.utmMedium || null,
        contact_utm_campaign: contactAttribution.campaign || null,
        contact_utm_content: contactAttribution.utmContent || null,
        contact_referrer: contactAttribution.referrer || null,
        contact_gclid: contactAttribution.gclid || null,
        contact_fbclid: contactAttribution.fbclid || null,
        contact_campaign_id: contactAttribution.campaignId || null,
        last_attribution_source: classifiedAttribution ? JSON.stringify(classifiedAttribution) : null
      };
      
      // Check for existing discovery to prevent duplicates
      // Use GHL appointment ID as primary unique identifier, with fallback to comprehensive matching
      const ghlAppointmentId = payload.appointment?.id;
      
      if (ghlAppointmentId) {
        // First check: Look for existing discovery with same GHL ID
        const { data: existingByGhlId } = await supabase
          .from('discoveries')
          .select('id, ghl_appointment_id')
          .eq('account_id', account.id)
          .eq('ghl_appointment_id', ghlAppointmentId)
          .maybeSingle();
        
        if (existingByGhlId) {
          console.log('📋 Duplicate discovery detected by GHL ID, skipping:', {
            existingId: existingByGhlId.id,
            ghlAppointmentId: ghlAppointmentId,
            contactName: discoveryData.contact_name,
            scheduledTime: discoveryData.date_booked_for
          });
          return;
        }
      }
      
      // Second check: Comprehensive duplicate detection for discoveries without GHL ID
      // Only consider it a duplicate if contact, time, AND either setter or sales rep match
      const { data: existingComprehensive } = await supabase
        .from('discoveries')
        .select('id, sales_rep_ghl_id, setter_ghl_id, ghl_appointment_id')
        .eq('account_id', account.id)
        .eq('contact_name', discoveryData.contact_name)
        .eq('date_booked_for', discoveryData.date_booked_for)
        .maybeSingle();
      
      if (existingComprehensive) {
        // Check if this is actually a different discovery with different people
        const sameRep = existingComprehensive.sales_rep_ghl_id === discoveryData.sales_rep_ghl_id;
        const sameSetter = existingComprehensive.setter_ghl_id === discoveryData.setter_ghl_id;
        const hasGhlId = existingComprehensive.ghl_appointment_id;
        
        if ((sameRep || sameSetter) && !hasGhlId) {
          console.log('📋 Duplicate discovery detected by comprehensive matching, skipping:', {
            existingId: existingComprehensive.id,
            contactName: discoveryData.contact_name,
            scheduledTime: discoveryData.date_booked_for,
            reason: sameRep ? 'same sales rep' : 'same setter'
          });
          return;
        } else {
          console.log('✅ Same contact/time but different team members - allowing as separate discovery:', {
            newSalesRep: discoveryData.sales_rep_ghl_id,
            existingSalesRep: existingComprehensive.sales_rep_ghl_id,
            newSetter: discoveryData.setter_ghl_id,
            existingSetter: existingComprehensive.setter_ghl_id
          });
        }
      }

      const { data: savedDiscovery, error: saveError } = await supabase
        .from('discoveries')
        .insert(discoveryData)
        .select()
        .single();
      
      if (saveError) {
        console.error('Failed to save discovery:', saveError);
        throw new Error(`Failed to save discovery: ${saveError.message}`);
      }
      
      console.log('✅ Discovery saved successfully:', payload.appointment?.id);
      
      // Refresh GHL user roles now that the discovery is saved
      try {
        console.log('🔄 Refreshing GHL user roles after discovery save...');

        // Setter is the appointment owner
        if (salesRepData?.id) {
          await supabase.rpc('update_ghl_user_roles_with_context' as any, {
            p_account_id: account.id,
            p_ghl_user_id: salesRepData.id,
            p_current_role: 'setter'
          });
          console.log('✅ Refreshed setter role:', salesRepData.id);
        }
      } catch (refreshError) {
        console.error('⚠️ Failed to refresh GHL user roles (non-critical):', refreshError);
        // Don't throw - this is not critical to discovery processing
      }
      
      // Removed dial linking for discoveries per new rules
    }
    
  } catch (error) {
    console.error('Error processing appointment webhook:', error);
    throw error;
  }
}

// Helper function to process appointment update webhooks
async function processAppointmentUpdateWebhook(payload: any) {
  console.log('🔄 Processing appointment update webhook:', {
    appointmentId: payload.appointment?.id,
    locationId: payload.locationId,
    calendarId: payload.appointment?.calendarId,
    title: payload.appointment?.title,
    startTime: payload.appointment?.startTime,
  });
  
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, serviceKey);
    
    // Find account by GHL location ID using accounts table
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id, name, ghl_location_id, ghl_api_key')
      .eq('ghl_location_id', payload.locationId)
      .single();
    
    if (accountError || !account) {
      console.warn('⚠️ Webhook received for unknown location ID:', payload.locationId);
      return;
    }
    
    console.log('📍 Found account:', account.name, '(', account.id, ')');
    
    // Check if this appointment's calendar is mapped
    const { data: calendarMapping, error: mappingError } = await supabase
      .from('calendar_mappings')
      .select('*')
      .eq('account_id', account.id)
      .eq('ghl_calendar_id', payload.appointment?.calendarId)
      .single();
    
    if (mappingError || !calendarMapping) {
      console.log('📋 Calendar not mapped for appointment update, skipping:', {
        calendarId: payload.appointment?.calendarId,
        appointmentId: payload.appointment?.id
      });
      return;
    }
    
    // For updates, we'll try to find and update existing appointment/discovery
    // Since we don't have a GHL appointment ID in our schema, we'll log for now
    console.log('📝 Would update appointment in:', calendarMapping.target_table, {
      appointmentId: payload.appointment?.id,
      newStartTime: payload.appointment?.startTime,
      newTitle: payload.appointment?.title
    });
    
    // TODO: Implement proper update logic once we have unique identifiers
    
  } catch (error) {
    console.error('Error processing appointment update webhook:', error);
    throw error;
  }
}

// Helper function to process appointment deletion webhooks
async function processAppointmentDeleteWebhook(payload: any) {
  console.log('🗑️ Processing appointment deletion webhook:', {
    appointmentId: payload.appointment?.id,
    locationId: payload.locationId,
    calendarId: payload.appointment?.calendarId,
  });
  
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, serviceKey);
    
    // Find account by GHL location ID using accounts table
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id, name, ghl_location_id, ghl_api_key')
      .eq('ghl_location_id', payload.locationId)
      .single();
    
    if (accountError || !account) {
      console.warn('⚠️ Webhook received for unknown location ID:', payload.locationId);
      return;
    }
    
    console.log('📍 Found account:', account.name, '(', account.id, ')');
    
    // Check if this appointment's calendar is mapped
    const { data: calendarMapping, error: mappingError } = await supabase
      .from('calendar_mappings')
      .select('*')
      .eq('account_id', account.id)
      .eq('ghl_calendar_id', payload.appointment?.calendarId)
      .single();
    
    if (mappingError || !calendarMapping) {
      console.log('📋 Calendar not mapped for appointment deletion, skipping:', {
        calendarId: payload.appointment?.calendarId,
        appointmentId: payload.appointment?.id
      });
      return;
    }
    
    // For deletions, we'll try to find and mark appointment/discovery as cancelled
    // Since we don't have a GHL appointment ID in our schema, we'll log for now
    console.log('🗑️ Would mark appointment as cancelled in:', calendarMapping.target_table, {
      appointmentId: payload.appointment?.id,
      reason: 'Deleted in GHL'
    });
    
    // TODO: Implement proper deletion/cancellation logic once we have unique identifiers
    
  } catch (error) {
    console.error('Error processing appointment deletion webhook:', error);
    throw error;
  }
}

// Helper function to link an appointment/discovery back to its originating dial
async function linkAppointmentToDial(
  supabase: any,
  appointmentOrDiscovery: any,
  contactData: any,
  accountId: string
): Promise<void> {
  try {
    if (!contactData || (!contactData.email && !contactData.phone)) {
      console.log('⚠️ No contact data available for dial linking');
      return;
    }

    console.log('🔗 Searching for originating dial to link appointment:', {
      appointmentId: appointmentOrDiscovery.id,
      contactEmail: contactData.email,
      contactPhone: contactData.phone,
      scheduledTime: appointmentOrDiscovery.date_booked_for
    });

    // Build query to find the most recent dial that could have led to this appointment
    const webhookReceivedTime = new Date(); 
    const searchWindowStart = new Date(webhookReceivedTime.getTime() - (24 * 60 * 60 * 1000)); // 24 hours before now

    let dialQuery = supabase
      .from('dials')
      .select('id, date_called, email, phone, setter')
      .eq('account_id', accountId)
      .gte('date_called', searchWindowStart.toISOString()) // Within last 24 hours
      .lte('date_called', webhookReceivedTime.toISOString()) // Up to now
      .order('date_called', { ascending: false })
      .limit(1); // Get the most recent dial

    // Add contact matching conditions (prefer email, fallback to phone)
    if (contactData.email) {
      dialQuery = dialQuery.eq('email', contactData.email);
    } else if (contactData.phone) {
      dialQuery = dialQuery.eq('phone', contactData.phone);
    } else {
      console.log('⚠️ No email or phone available for contact matching');
      return;
    }

    const { data: recentDials, error: dialError } = await dialQuery;

    if (dialError) {
      console.error('Error searching for dials:', dialError);
      return;
    }

    if (!recentDials || recentDials.length === 0) {
      console.log('ℹ️ No recent dials found within 24 hours of webhook receipt');
      return;
    }

    // Use the most recent dial (first in descending order)
    const relevantDial = recentDials[0];
    
    console.log('✅ Found most recent dial for appointment booking:', {
      dialId: relevantDial.id,
      dialTime: relevantDial.date_called,
      appointmentId: appointmentOrDiscovery.id,
      contact: contactData.email || contactData.phone
    });

    // Note: Since dials table doesn't have booked_appointment_id column in current schema,
    // we'll log this for now but not attempt to update the dials table
    console.log('📝 Would link dial to appointment:', {
      dialId: relevantDial.id,
      appointmentId: appointmentOrDiscovery.id,
      setter: relevantDial.setter
    });

    // Update the appointment/discovery with setter information from the dial if missing
    if (relevantDial.setter && !appointmentOrDiscovery.setter) {
      const tableName = appointmentOrDiscovery.total_sales_value !== undefined ? 'appointments' : 'discoveries';
      const { error: setterUpdateError } = await supabase
        .from(tableName)
        .update({ 
          setter: relevantDial.setter
        })
        .eq('id', appointmentOrDiscovery.id);

      if (setterUpdateError) {
        console.error('Failed to update setter information from dial:', setterUpdateError);
      } else {
        console.log('✅ Updated setter information from linked dial');
      }
    }

  } catch (error) {
    console.error('Error in linkAppointmentToDial:', error);
    // Don't throw - this shouldn't fail the entire appointment processing
  }
}

// Helper function to validate timestamp
function isTimestampValid(timestamp: string): boolean {
  try {
    const webhookTime = new Date(timestamp).getTime();
    const now = Date.now();
    const fiveMinutesAgo = now - (5 * 60 * 1000);
    
    // Allow webhooks from the last 5 minutes
    return webhookTime > fiveMinutesAgo && webhookTime <= now;
  } catch {
    return false;
  }
}

/**
 * Attempts to recover a missing location ID by finding an OAuth account 
 * and checking if the webhook location ID matches any of their accessible locations
 */
async function tryRecoverLocationId(supabase: any, webhookLocationId: string): Promise<any> {
  console.log('🔍 Attempting location ID recovery for:', webhookLocationId);
  
  // Find accounts with OAuth but missing/incorrect location ID
  const { data: oauthAccounts, error } = await supabase
    .from('accounts')
    .select('id, name, ghl_api_key, ghl_location_id')
    .eq('ghl_auth_type', 'oauth2')
    .not('ghl_api_key', 'is', null);
  
  if (error || !oauthAccounts?.length) {
    console.log('❌ No OAuth accounts found for location recovery');
    return null;
  }
  
  // Try each OAuth account to see if they have access to this location
  for (const account of oauthAccounts) {
    try {
      console.log(`🔎 Checking if account "${account.name}" has access to location ${webhookLocationId}`);
      
      const headers = {
        'Authorization': `Bearer ${account.ghl_api_key}`,
        'Version': '2021-07-28',
        'Accept': 'application/json'
      };
      
      // Fetch accessible locations for this account
      const locationsResp = await fetch('https://services.leadconnectorhq.com/locations', { headers });
      
      if (locationsResp.ok) {
        const locData = await locationsResp.json();
        const locations = locData.locations || [];
        
        // Check if webhook location ID is in their accessible locations
        const matchingLocation = locations.find((loc: any) => loc.id === webhookLocationId);
        
        if (matchingLocation) {
          console.log(`✅ Found matching location! Updating account "${account.name}" with location ID: ${webhookLocationId}`);
          
          // Update the account with the correct location ID
          const { error: updateError } = await supabase
            .from('accounts')
            .update({ ghl_location_id: webhookLocationId })
            .eq('id', account.id);
          
          if (updateError) {
            console.error('❌ Failed to update location ID:', updateError);
            continue;
          }
          
          return { ...account, ghl_location_id: webhookLocationId };
        }
      } else {
        console.warn(`⚠️ Failed to fetch locations for account "${account.name}":`, locationsResp.status);
      }
    } catch (err) {
      console.error(`❌ Error checking account "${account.name}":`, err);
      continue;
    }
  }
  
  console.log('❌ Location ID recovery failed - no matching account found');
  return null;
}

// Handle GET requests for webhook verification
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'GHL Webhook endpoint is active at /api/webhook/call-events',
    timestamp: new Date().toISOString()
  });
} 