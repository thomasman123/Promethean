import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Store webhook IDs to prevent replay attacks
const processedWebhookIds = new Set<string>();

// Helper function to fetch GHL user details with fallback mechanisms
async function fetchGhlUserDetails(userId: string, accessToken: string, locationId: string): Promise<any | null> {
  try {
    console.log('🔍 Fetching user details from GHL for userId:', userId);
    
    // Try individual user endpoint first
    let userResponse = await fetch(`https://services.leadconnectorhq.com/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Version': '2021-07-28',
      },
    });
    
    if (userResponse.ok) {
      const userData = await userResponse.json();
      console.log('✅ User data retrieved via individual endpoint:', {
        name: userData?.name,
        email: userData?.email,
        firstName: userData?.firstName,
        lastName: userData?.lastName
      });
      return userData;
    }
    
    console.log('⚠️ Individual user endpoint failed, trying location users endpoint...');
    
    // Fallback: Fetch all users from location and find the specific user
    const locationUsersResponse = await fetch(`https://services.leadconnectorhq.com/locations/${locationId}/users/`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Version': '2021-07-28',
      },
    });
    
    if (locationUsersResponse.ok) {
      const locationUsersData = await locationUsersResponse.json();
      const users = locationUsersData.users || locationUsersData;
      
      // Find the specific user by ID
      const userData = Array.isArray(users) ? users.find((user: any) => user.id === userId) : null;
      
      if (userData) {
        console.log('✅ User data retrieved via location users endpoint:', {
          name: userData?.name,
          email: userData?.email,
          firstName: userData?.firstName,
          lastName: userData?.lastName
        });
        return userData;
      } else {
        console.log('⚠️ User not found in location users list');
      }
    } else {
      console.error('Failed to fetch location users for user lookup');
    }
    
    // Log the original error for debugging
    const errorText = await userResponse.text();
    console.error('Original user fetch error:', {
      status: userResponse.status,
      statusText: userResponse.statusText,
      error: errorText,
      userId: userId
    });
    
    return null;
  } catch (error) {
    console.error('❌ Error fetching user from GHL:', error);
    return null;
  }
}

// Helper to ensure we have a valid GHL access token for API calls
async function getValidGhlAccessToken(account: any, supabase: any, forceRefresh?: boolean): Promise<string | null> {
  try {
    const authType = account.ghl_auth_type || 'oauth2';
    const currentAccessToken = account.ghl_api_key as string | null;
    const refreshToken = account.ghl_refresh_token as string | null;
    const expiresAtIso = account.ghl_token_expires_at as string | null;

    // If not OAuth, just return the stored key
    if (authType !== 'oauth2') {
      return currentAccessToken || null;
    }

    const clientId = process.env.GHL_CLIENT_ID;
    const clientSecret = process.env.GHL_CLIENT_SECRET;

    // If we can't refresh, return what we have
    if (!clientId || !clientSecret) {
      console.warn('⚠️ Missing GHL OAuth client credentials; using stored token');
      return currentAccessToken || null;
    }

    const now = Date.now();
    const expiresAtMs = expiresAtIso ? new Date(expiresAtIso).getTime() : 0;
    const skewMs = 2 * 60 * 1000; // 2 minutes
    const needsRefresh = forceRefresh || !currentAccessToken || !expiresAtMs || now >= (expiresAtMs - skewMs);

    if (!needsRefresh) {
      return currentAccessToken as string;
    }

    if (!refreshToken) {
      console.warn('⚠️ No refresh token available; using stored access token even if possibly expired');
      return currentAccessToken || null;
    }

    // Refresh the access token
    const resp = await fetch('https://services.leadconnectorhq.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error('❌ Failed to refresh GHL access token:', errorText);
      return currentAccessToken || null;
    }

    const tokenData = await resp.json();
    const newAccessToken = tokenData.access_token as string;
    const newRefreshToken = (tokenData.refresh_token as string) || refreshToken;
    const newExpiresAtIso = new Date(Date.now() + (tokenData.expires_in as number) * 1000).toISOString();

    // Persist updated tokens
    await supabase
      .from('accounts')
      .update({
        ghl_api_key: newAccessToken,
        ghl_refresh_token: newRefreshToken,
        ghl_token_expires_at: newExpiresAtIso,
        ghl_auth_type: 'oauth2',
      })
      .eq('id', account.id);

    return newAccessToken;
  } catch (e) {
    console.warn('⚠️ Token helper failed, falling back to stored token');
    return account?.ghl_api_key || null;
  }
}

export async function POST(request: NextRequest) {
  console.log('📞 Received GHL webhook at /api/webhook/call-events');
  
  const startTime = Date.now();
  let webhookLogId: string | null = null;
  let supabase: any = null;
  
  try {
    // Initialize Supabase client early for logging
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    supabase = createClient(supabaseUrl, serviceKey);
    
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
    
    // Parse the payload
    let payload: any;
    try {
      payload = JSON.parse(body);
    } catch (parseError) {
      console.error('Failed to parse webhook payload:', parseError);
      
      // Log failed webhook
      try {
        await supabase
          .from('webhook_logs')
          .insert({
            method: request.method,
            url: request.url,
            user_agent: userAgent,
            headers: allHeaders,
            raw_body: body,
            body_length: body.length,
            processing_status: 'failed',
            processing_error: 'Invalid JSON payload',
            response_status: 400,
            webhook_type: 'unknown',
            source: 'ghl',
            processing_duration_ms: Date.now() - startTime,
          });
      } catch (logError) {
        console.error('Failed to log webhook error:', logError);
      }
      
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }
    
    // Create comprehensive webhook log entry
    try {
      const { data: logEntry } = await supabase
        .from('webhook_logs')
        .insert({
          method: request.method,
          url: request.url,
          user_agent: userAgent,
          headers: allHeaders,
          raw_body: body,
          parsed_body: payload,
          body_length: body.length,
          processing_status: 'received',
          webhook_type: payload.type || 'unknown',
          source: 'ghl',
          location_id: payload.locationId || null,
          metadata: {
            messageType: payload.messageType,
            contactId: payload.contactId,
            appointmentId: payload.appointment?.id,
            callDuration: payload.callDuration,
            callStatus: payload.callStatus,
            direction: payload.direction,
          },
        })
        .select('id')
        .single();
        
      webhookLogId = logEntry?.id || null;
      console.log('📝 Webhook logged with ID:', webhookLogId);
    } catch (logError) {
      console.error('Failed to create webhook log entry:', logError);
      // Continue processing even if logging fails
    }
    
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
      
      // Update webhook log status
      if (webhookLogId) {
        try {
          await supabase
            .from('webhook_logs')
            .update({
              processing_status: 'processed',
              response_status: 200,
              processing_duration_ms: Date.now() - startTime,
              processing_error: 'Duplicate webhook ID - already processed',
            })
            .eq('id', webhookLogId);
        } catch (updateError) {
          console.error('Failed to update webhook log:', updateError);
        }
      }
      
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
        
        // Update webhook log as processed successfully
        if (webhookLogId) {
          try {
            await supabase
              .from('webhook_logs')
              .update({
                processing_status: 'processed',
                response_status: 200,
                processing_duration_ms: Date.now() - startTime,
              })
              .eq('id', webhookLogId);
          } catch (updateError) {
            console.error('Failed to update webhook log:', updateError);
          }
        }
        
        console.log('✅ Phone call webhook processed successfully');
        return NextResponse.json({ message: 'Phone call webhook processed successfully' });
        
      } catch (error) {
        console.error('Failed to process phone call webhook:', error);
        
        // Update webhook log as failed
        if (webhookLogId) {
          try {
            await supabase
              .from('webhook_logs')
              .update({
                processing_status: 'failed',
                response_status: 500,
                processing_duration_ms: Date.now() - startTime,
                processing_error: error instanceof Error ? error.message : String(error),
              })
              .eq('id', webhookLogId);
          } catch (updateError) {
            console.error('Failed to update webhook log:', updateError);
          }
        }
        
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
        
        // Update webhook log as processed successfully
        if (webhookLogId) {
          try {
            await supabase
              .from('webhook_logs')
              .update({
                processing_status: 'processed',
                response_status: 200,
                processing_duration_ms: Date.now() - startTime,
              })
              .eq('id', webhookLogId);
          } catch (updateError) {
            console.error('Failed to update webhook log:', updateError);
          }
        }
        
        console.log('✅ Appointment webhook processed successfully');
        return NextResponse.json({ message: 'Appointment webhook processed successfully' });
        
      } catch (error) {
        console.error('Failed to process appointment webhook:', error);
        
        // Update webhook log as failed
        if (webhookLogId) {
          try {
            await supabase
              .from('webhook_logs')
              .update({
                processing_status: 'failed',
                response_status: 500,
                processing_duration_ms: Date.now() - startTime,
                processing_error: error instanceof Error ? error.message : String(error),
              })
              .eq('id', webhookLogId);
          } catch (updateError) {
            console.error('Failed to update webhook log:', updateError);
          }
        }
        
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
        
        // Update webhook log as processed successfully
        if (webhookLogId) {
          try {
            await supabase
              .from('webhook_logs')
              .update({
                processing_status: 'processed',
                response_status: 200,
                processing_duration_ms: Date.now() - startTime,
              })
              .eq('id', webhookLogId);
          } catch (updateError) {
            console.error('Failed to update webhook log:', updateError);
          }
        }
        
        console.log('✅ Appointment update webhook processed successfully');
        return NextResponse.json({ message: 'Appointment update webhook processed successfully' });
        
      } catch (error) {
        console.error('Failed to process appointment update webhook:', error);
        
        // Update webhook log as failed
        if (webhookLogId) {
          try {
            await supabase
              .from('webhook_logs')
              .update({
                processing_status: 'failed',
                response_status: 500,
                processing_duration_ms: Date.now() - startTime,
                processing_error: error instanceof Error ? error.message : String(error),
              })
              .eq('id', webhookLogId);
          } catch (updateError) {
            console.error('Failed to update webhook log:', updateError);
          }
        }
        
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
        
        // Update webhook log as processed successfully
        if (webhookLogId) {
          try {
            await supabase
              .from('webhook_logs')
              .update({
                processing_status: 'processed',
                response_status: 200,
                processing_duration_ms: Date.now() - startTime,
              })
              .eq('id', webhookLogId);
          } catch (updateError) {
            console.error('Failed to update webhook log:', updateError);
          }
        }
        
        console.log('✅ Appointment deletion webhook processed successfully');
        return NextResponse.json({ message: 'Appointment deletion webhook processed successfully' });
        
      } catch (error) {
        console.error('Failed to process appointment deletion webhook:', error);
        
        // Update webhook log as failed
        if (webhookLogId) {
          try {
            await supabase
              .from('webhook_logs')
              .update({
                processing_status: 'failed',
                response_status: 500,
                processing_duration_ms: Date.now() - startTime,
                processing_error: error instanceof Error ? error.message : String(error),
              })
              .eq('id', webhookLogId);
          } catch (updateError) {
            console.error('Failed to update webhook log:', updateError);
          }
        }
        
        return NextResponse.json(
          { error: 'Failed to process appointment deletion webhook' },
          { status: 500 }
        );
      }
    }
    // Process ContactCreate webhooks
    else if (payload.type === 'ContactCreate') {
      console.log('👤 Processing contact creation webhook')
      try {
        // Use new contact sync strategy
        const { processContactCreateWebhook } = await import('@/lib/contact-sync-strategy')
        
        // Find account first
        const locationId = payload.locationId || payload.location_id
        const { data: account } = await supabase
          .from('accounts')
          .select('id')
          .eq('ghl_location_id', locationId)
          .single()

        if (account) {
          await processContactCreateWebhook(payload, account.id)
        } else {
          console.warn('❌ Account not found for ContactCreate webhook:', locationId)
        }
        
        if (webhookId) {
          processedWebhookIds.add(webhookId)
          if (processedWebhookIds.size > 1000) {
            const idsArray = Array.from(processedWebhookIds)
            const toKeep = idsArray.slice(-800)
            processedWebhookIds.clear()
            toKeep.forEach(id => processedWebhookIds.add(id))
          }
        }
        
        // Update webhook log as processed successfully
        if (webhookLogId) {
          try {
            await supabase
              .from('webhook_logs')
              .update({
                processing_status: 'processed',
                response_status: 200,
                processing_duration_ms: Date.now() - startTime,
              })
              .eq('id', webhookLogId);
          } catch (updateError) {
            console.error('Failed to update webhook log:', updateError);
          }
        }
        
        return NextResponse.json({ message: 'Contact create processed' })
      } catch (e) {
        console.error('Failed to process contact create:', e)
        
        // Update webhook log as failed
        if (webhookLogId) {
          try {
            await supabase
              .from('webhook_logs')
              .update({
                processing_status: 'failed',
                response_status: 500,
                processing_duration_ms: Date.now() - startTime,
                processing_error: e instanceof Error ? e.message : String(e),
              })
              .eq('id', webhookLogId);
          } catch (updateError) {
            console.error('Failed to update webhook log:', updateError);
          }
        }
        
        return NextResponse.json({ error: 'Failed to process contact create' }, { status: 500 })
      }
    }
    // Process ContactUpdate webhooks
    else if (payload.type === 'ContactUpdate') {
      console.log('📝 Processing contact update webhook')
      try {
        await processContactUpsertWebhook(payload)
        if (webhookId) {
          processedWebhookIds.add(webhookId)
          if (processedWebhookIds.size > 1000) {
            const idsArray = Array.from(processedWebhookIds)
            const toKeep = idsArray.slice(-800)
            processedWebhookIds.clear()
            toKeep.forEach(id => processedWebhookIds.add(id))
          }
        }
        
        // Update webhook log as processed successfully
        if (webhookLogId) {
          try {
            await supabase
              .from('webhook_logs')
              .update({
                processing_status: 'processed',
                response_status: 200,
                processing_duration_ms: Date.now() - startTime,
              })
              .eq('id', webhookLogId);
          } catch (updateError) {
            console.error('Failed to update webhook log:', updateError);
          }
        }
        
        return NextResponse.json({ message: 'Contact update processed' })
      } catch (e) {
        console.error('Failed to process contact update:', e)
        
        // Update webhook log as failed
        if (webhookLogId) {
          try {
            await supabase
              .from('webhook_logs')
              .update({
                processing_status: 'failed',
                response_status: 500,
                processing_duration_ms: Date.now() - startTime,
                processing_error: e instanceof Error ? e.message : String(e),
              })
              .eq('id', webhookLogId);
          } catch (updateError) {
            console.error('Failed to update webhook log:', updateError);
          }
        }
        
        return NextResponse.json({ error: 'Failed to process contact update' }, { status: 500 })
      }
    } else {
      console.log('📋 Non-supported webhook received:', {
        type: payload.type,
        messageType: payload.messageType
      });
      
      // Update webhook log for unsupported webhook type
      if (webhookLogId) {
        try {
          await supabase
            .from('webhook_logs')
            .update({
              processing_status: 'processed',
              response_status: 200,
              processing_duration_ms: Date.now() - startTime,
              processing_error: 'Webhook type not supported',
            })
            .eq('id', webhookLogId);
        } catch (updateError) {
          console.error('Failed to update webhook log:', updateError);
        }
      }
      
      return NextResponse.json({ message: 'Webhook received but not supported' });
    }
    
  } catch (error) {
    console.error('GHL webhook processing error:', error);
    
    // Update webhook log as failed if we have the ID
    if (webhookLogId && supabase) {
      try {
        await supabase
          .from('webhook_logs')
          .update({
            processing_status: 'failed',
            response_status: 500,
            processing_duration_ms: Date.now() - startTime,
            processing_error: error instanceof Error ? error.message : String(error),
          })
          .eq('id', webhookLogId);
      } catch (updateError) {
        console.error('Failed to update webhook log:', updateError);
      }
    }
    
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
    
    // Find account by GHL location ID using the ghl_locations table
    const { data: locationData, error: locationError } = await supabase
      .from('ghl_locations')
      .select(`
        account_id,
        location_id,
        accounts!inner(
          id, 
          name, 
          ghl_location_id, 
          ghl_api_key
        )
      `)
      .eq('location_id', payload.locationId)
      .single();
    
    const account = locationData?.accounts as any;
    
    if (locationError || !account) {
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
      const userData = await fetchGhlUserDetails(payload.userId, account.ghl_api_key, account.ghl_location_id || '');
      
      if (userData) {
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
    }
    
    // Link setter to an existing app user and capture setter_user_id for the dial
    let linkedSetterUserId: string | null = null;
    try {
      const { linkExistingUsersToData } = await import('@/lib/auto-user-creation');
      const userIds = await linkExistingUsersToData(
        supabase,
        account.id,
        setterName,
        null,
        setterEmail,
        null
      );
      linkedSetterUserId = userIds.setterUserId || null;
      console.log('✅ User link results for dial:', { setterUserId: linkedSetterUserId || 'None' });
    } catch (linkErr) {
      console.warn('⚠️ Failed to link setter user for dial (non-critical):', linkErr);
    }
    
    // Get contact information by fetching from GHL API
    let currentAccessToken = account.ghl_api_key
    let contactName = null;
    let contactEmail = null;
    let contactPhone = null;
    // Attribution and contact source from contact
    let dialAttrSource: any = null;
    let dialLastAttrSource: any = null;
    let contactSource: string | null = null;
    
    if (payload.contactId) {
      try {
        console.log('🔍 Fetching contact details from GHL for contactId:', payload.contactId);
        
        const makeContactHeaders = (token: string | null) => ({
          'Authorization': `Bearer ${token}`,
          'Version': '2021-07-28',
        } as Record<string, string>);

        let contactToken = currentAccessToken;
        let contactResponse = await fetch(`https://services.leadconnectorhq.com/contacts/${payload.contactId}`, {
          headers: makeContactHeaders(contactToken),
        });
        
        if (contactResponse.ok) {
          const rawContact = await contactResponse.json();
          const c: any = rawContact?.contact || rawContact;
          contactName = c?.name || 
                       (c?.firstName && c?.lastName ? 
                        `${c.firstName} ${c.lastName}`.trim() : 
                        c?.firstName || c?.lastName) || null;
          contactEmail = c?.email || null;
          contactPhone = c?.phone || null;
          // capture attribution and source (same as appointments/discoveries)
          dialAttrSource = c?.attributionSource || null;
          dialLastAttrSource = c?.lastAttributionSource || null;
          contactSource = c?.source || null;
          
          console.log('✅ Successfully fetched contact data:', {
            name: contactName,
            email: contactEmail,
            phone: contactPhone
          });
        } else if (contactResponse.status === 401 || contactResponse.status === 403) {
          console.warn('⚠️ Contact fetch unauthorized - attempting token refresh');
          const refreshedToken = await getValidGhlAccessToken(account, supabase, true);
          if (refreshedToken) {
            contactToken = refreshedToken;
            contactResponse = await fetch(`https://services.leadconnectorhq.com/contacts/${payload.contactId}`, {
              headers: makeContactHeaders(contactToken),
            });
            if (contactResponse.ok) {
              const rawContact = await contactResponse.json();
              const c: any = rawContact?.contact || rawContact;
              contactName = c?.name || 
                           (c?.firstName && c?.lastName ? 
                            `${c.firstName} ${c.lastName}`.trim() : 
                            c?.firstName || c?.lastName) || null;
              contactEmail = c?.email || null;
              contactPhone = c?.phone || null;
              dialAttrSource = c?.attributionSource || null;
              dialLastAttrSource = c?.lastAttributionSource || null;
              contactSource = c?.source || null;

              console.log('✅ Successfully fetched contact data after token refresh:', {
                name: contactName,
                email: contactEmail,
                phone: contactPhone
              });
            } else {
              console.log('⚠️ Contact not found in GHL API after token refresh');
            }
          } else {
            console.warn('⚠️ Token refresh failed - contact enrichment skipped');
          }
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
      setter: setterName || 'Unknown',
      setter_user_id: linkedSetterUserId,
      duration: payload.callDuration || 0,
      call_recording_link: payload.attachments?.[0] || null,
      answered: payload.callDuration > 30 && payload.status === 'completed' && payload.callStatus !== 'voicemail',
      meaningful_conversation: payload.callDuration > 120 && payload.status === 'completed' && payload.callStatus !== 'voicemail',
      date_called: new Date(payload.timestamp || payload.dateAdded || new Date().toISOString()).toISOString(),
      contact_email_snapshot: contactEmail || null,
      contact_phone_snapshot: contactPhone || null,
      contact_name_snapshot: contactName || null,
    } as any;

    // Try to upsert contact first
    try {
      const contactUpsert = {
        account_id: account.id,
        ghl_contact_id: payload.contactId || null,
        first_name: contactName?.split(' ')?.[0] || null,
        last_name: contactName?.split(' ')?.slice(1).join(' ') || null,
        name: contactName || null,
        email: contactEmail || null,
        phone: contactPhone || null,
        source: contactSource || null,
        attribution_source: dialAttrSource || null,
        last_attribution_source: dialLastAttrSource || null,
        date_added: new Date().toISOString(), // Set current time as fallback
      }
      
      console.log('👤 Contact data for dial:', {
        hasGhlContactId: !!contactUpsert.ghl_contact_id,
        hasEmail: !!contactUpsert.email,
        hasPhone: !!contactUpsert.phone,
        hasName: !!contactUpsert.name,
        contactData: contactUpsert
      });
      
      if (contactUpsert.ghl_contact_id || contactUpsert.email || contactUpsert.phone) {
        console.log('📝 Upserting contact for dial...');
        const { data: up, error: upsertError } = await supabase
          .from('contacts')
          .upsert(contactUpsert, { onConflict: 'account_id,ghl_contact_id' })
          .select('id')
          .maybeSingle()
        
        if (upsertError) {
          console.error('❌ Contact upsert failed:', upsertError);
          
          // FUTURE-PROOF FALLBACK: Use the same API process as Sync Contacts button
          if (payload.contactId && typeof payload.contactId === 'string') {
            console.log('🔄 Attempting contact sync from GHL API as fallback...');
            const { syncSingleContactFromGHL } = await import('@/lib/ghl-contact-sync');
            const syncResult = await syncSingleContactFromGHL(account.id, payload.contactId);
            
            if (syncResult.success && syncResult.contactId) {
              dialData.contact_id = syncResult.contactId;
              console.log('✅ Contact synced from GHL and linked to dial:', syncResult.contactId);
            } else {
              console.log('⚠️ GHL contact sync also failed:', syncResult.error);
            }
          }
        } else if (up?.id) {
          dialData.contact_id = up.id
          console.log('✅ Contact linked to dial:', up.id);
        } else {
          console.log('⚠️ Contact upsert succeeded but no ID returned');
          
          // FUTURE-PROOF FALLBACK: Try GHL sync if we have a contact ID
          if (payload.contactId && typeof payload.contactId === 'string') {
            console.log('🔄 Attempting contact sync from GHL API as fallback...');
            const { syncSingleContactFromGHL } = await import('@/lib/ghl-contact-sync');
            const syncResult = await syncSingleContactFromGHL(account.id, payload.contactId);
            
            if (syncResult.success && syncResult.contactId) {
              dialData.contact_id = syncResult.contactId;
              console.log('✅ Contact synced from GHL and linked to dial:', syncResult.contactId);
            }
          }
        }
      } else {
        console.log('⚠️ No contact identifiers available - attempting GHL sync as last resort');
        
        // FUTURE-PROOF FALLBACK: Even without basic identifiers, try GHL sync if we have contact ID
        if (payload.contactId && typeof payload.contactId === 'string') {
          console.log('🔄 Attempting contact sync from GHL API...');
          const { syncSingleContactFromGHL } = await import('@/lib/ghl-contact-sync');
          const syncResult = await syncSingleContactFromGHL(account.id, payload.contactId);
          
          if (syncResult.success && syncResult.contactId) {
            dialData.contact_id = syncResult.contactId;
            console.log('✅ Contact synced from GHL and linked to dial:', syncResult.contactId);
          } else {
            console.log('⚠️ No contact data available for dial - will save without contact linking');
            console.log('📋 Missing contact data debug:', {
              rawPayload: {
                contactId: payload.contactId,
                userId: payload.userId,
                messageId: payload.messageId
              },
              fetchedData: {
                contactName,
                contactEmail, 
                contactPhone
              }
            });
          }
        } else {
          console.log('⚠️ No contact ID available - dial will be saved without contact linking');
        }
      }
    } catch (contactError) {
      console.error('❌ Error in contact upsert process:', contactError);
      
      // FUTURE-PROOF FALLBACK: Try GHL sync even after errors
      if (payload.contactId && typeof payload.contactId === 'string') {
        try {
          console.log('🔄 Attempting contact sync from GHL API after error...');
          const { syncSingleContactFromGHL } = await import('@/lib/ghl-contact-sync');
          const syncResult = await syncSingleContactFromGHL(account.id, payload.contactId);
          
          if (syncResult.success && syncResult.contactId) {
            dialData.contact_id = syncResult.contactId;
            console.log('✅ Contact synced from GHL after error and linked to dial:', syncResult.contactId);
          }
        } catch (syncError) {
          console.error('❌ GHL contact sync also failed:', syncError);
        }
      }
    }

    console.log('💾 Saving dial data:', {
      ...dialData,
      setter_info: setterName ? { name: setterName, email: setterEmail } : null
    });
    
    // Save to dials table
    const { data: savedDial, error: dialError } = await supabase
      .from('dials')
      .insert(sanitizeRecord(dialData))
      .select()
      .single();
    
    if (dialError) {
      console.error('Failed to save dial:', dialError);
      throw dialError;
    }
    
    console.log('✅ Dial saved successfully:', savedDial.id);
    
    // New: If the appointment already exists (dial arrived after appointment), link it here
    // FIXED: Only link appointments that happen AFTER the dial, within 30 minutes
    try {
      if (dialData.contact_id) {
        const dialTimeIso = dialData.date_called;
        if (dialTimeIso) {
          const dialTime = new Date(dialTimeIso);
          // Look for appointments within ±30 minutes of dial (appointment can be booked during call before hangup)
          const windowStart = new Date(dialTime.getTime() - 30 * 60 * 1000); // 30 minutes before dial
          const windowEnd = new Date(dialTime.getTime() + 30 * 60 * 1000); // 30 minutes after dial

          const { data: matchedAppts } = await supabase
            .from('appointments')
            .select('id, date_booked, contact_id')
            .eq('account_id', account.id)
            .eq('contact_id', dialData.contact_id)
            .gte('date_booked', windowStart.toISOString())
            .lte('date_booked', windowEnd.toISOString())
            .order('date_booked', { ascending: true })
            .limit(1)
          const matchedAppt = matchedAppts && matchedAppts.length > 0 ? matchedAppts[0] : null

          if (matchedAppt) {
            const minutesDiff = (new Date(matchedAppt.date_booked).getTime() - dialTime.getTime()) / (1000 * 60);
            const { error: updErr } = await supabase
              .from('dials')
              .update({ 
                booked: true, 
                booked_appointment_id: matchedAppt.id,
              })
              .eq('id', savedDial.id);
            if (updErr) {
              console.error('Failed to mark dial as booked/link appointment (dial-first path):', updErr);
            } else {
              console.log('🔗 Linked dial to existing appointment (dial-first path):', { 
                dialId: savedDial.id, 
                appointmentId: matchedAppt.id,
                minutesAfterDial: Math.round(minutesDiff * 10) / 10
              });
            }
          } else {
            console.log('ℹ️ No appointment found within ±30 minutes of dial for linking via contact_id');
          }
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
    
    // Find account by GHL location ID using the ghl_locations table
    const { data: locationData, error: locationError } = await supabase
      .from('ghl_locations')
      .select(`
        account_id,
        location_id,
        accounts!inner(
          id, 
          name, 
          ghl_location_id, 
          ghl_api_key, 
          ghl_refresh_token, 
          ghl_token_expires_at, 
          ghl_auth_type
        )
      `)
      .eq('location_id', payload.locationId)
      .single();
    
    const account = locationData?.accounts as any;
    
    if (locationError || !account) {
      console.warn('⚠️ Webhook received for unknown location ID:', payload.locationId);
      
      // Try to find and update an account that might match this location
      const recoveredAccount = await tryRecoverLocationId(supabase, payload.locationId);
      if (recoveredAccount) {
        console.log('✅ Successfully recovered and updated location ID for account:', recoveredAccount.name);
        // Recursively call this function now that we have the location ID set
        return await processAppointmentWebhook(payload);
      }
      
      // Log helpful debugging info
      const { data: allLocations } = await supabase
        .from('ghl_locations')
        .select('location_id, location_name, accounts!inner(name, id, ghl_auth_type)');
      
      console.error('🚨 Location ID Recovery Failed', {
        webhookLocationId: payload.locationId,
        availableLocations: allLocations?.map(l => ({
          locationId: l.location_id,
          locationName: l.location_name,
          accountName: (l.accounts as any)?.name,
          accountId: (l.accounts as any)?.id,
        })) || [],
        solution: 'Please add this location ID to the ghl_locations table'
      });
      
      return;
    }
    
    console.log('📍 Found account:', account.name, '(', account.id, ')');

    // Ensure we have a valid access token for GHL API calls
    const initialAccessToken = await getValidGhlAccessToken(account, supabase);
    let currentAccessToken = initialAccessToken || account.ghl_api_key;
    
    // Try to find the caller user by fetching from GHL API and matching to platform users
    let callerUserId = null;
    let setterName = null;
    let setterEmail = null;
    
    if (payload.userId && currentAccessToken) {
      let userData = await fetchGhlUserDetails(payload.userId, currentAccessToken, account.ghl_location_id || '');
      
      // If the user fetch failed (possibly due to expired/revoked token), force refresh and retry once
      if (!userData) {
        console.log('🔁 Retrying user fetch after token refresh...');
        const refreshedToken = await getValidGhlAccessToken(account, supabase, true);
        if (refreshedToken && refreshedToken !== currentAccessToken) {
          currentAccessToken = refreshedToken;
          userData = await fetchGhlUserDetails(payload.userId, currentAccessToken, account.ghl_location_id || '');
        }
      }
      
      if (userData) {
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
    }
    
    // Link setter to an existing app user and capture setter_user_id for the dial
    let linkedSetterUserId: string | null = null;
    try {
      const { linkExistingUsersToData } = await import('@/lib/auto-user-creation');
      const userIds = await linkExistingUsersToData(
        supabase,
        account.id,
        setterName,
        null,
        setterEmail,
        null
      );
      linkedSetterUserId = userIds.setterUserId || null;
      console.log('✅ User link results for dial:', { setterUserId: linkedSetterUserId || 'None' });
    } catch (linkErr) {
      console.warn('⚠️ Failed to link setter user for dial (non-critical):', linkErr);
    }
    
    // Get contact information by fetching from GHL API
    let contactName = null;
    let contactEmail = null;
    let contactPhone = null;
    // Attribution and contact source from contact
    let dialAttrSource: any = null;
    let dialLastAttrSource: any = null;
    let contactSource: string | null = null;
    
    if (payload.contactId) {
      try {
        console.log('🔍 Fetching contact details from GHL for contactId:', payload.contactId);
        
        const contactUrl = `https://services.leadconnectorhq.com/contacts/${payload.contactId}`;
        const makeContactHeaders = (token: string | null) => ({
          'Authorization': `Bearer ${token}`,
          'Version': '2021-07-28',
        } as Record<string, string>);
        
        let tokenToUse = currentAccessToken || account.ghl_api_key;
        let contactResponse = await fetch(contactUrl, {
          headers: makeContactHeaders(tokenToUse as string),
        });
        
        // If unauthorized, attempt to refresh token once and retry
        if (contactResponse.status === 401 || contactResponse.status === 403) {
          const refreshedToken = await getValidGhlAccessToken(account, supabase, true);
          if (refreshedToken && refreshedToken !== currentAccessToken) {
            currentAccessToken = refreshedToken;
            tokenToUse = refreshedToken;
            contactResponse = await fetch(contactUrl, {
              headers: makeContactHeaders(tokenToUse as string),
            });
          }
        }
        
        if (contactResponse.ok) {
          const rawContact = await contactResponse.json();
          const c: any = rawContact?.contact || rawContact;
          contactName = c?.name || 
                       (c?.firstName && c?.lastName ? 
                        `${c.firstName} ${c.lastName}`.trim() : 
                        c?.firstName || c?.lastName) || null;
          contactEmail = c?.email || null;
          contactPhone = c?.phone || null;
          // capture attribution and source (same as appointments/discoveries)
          dialAttrSource = c?.attributionSource || null;
          dialLastAttrSource = c?.lastAttributionSource || null;
          contactSource = c?.source || null;
          
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
      setter: setterName || 'Unknown',
      setter_user_id: linkedSetterUserId,
      duration: payload.callDuration || 0,
      call_recording_link: payload.attachments?.[0] || null,
      answered: payload.callDuration > 30 && payload.status === 'completed' && payload.callStatus !== 'voicemail',
      meaningful_conversation: payload.callDuration > 120 && payload.status === 'completed' && payload.callStatus !== 'voicemail',
      date_called: new Date(payload.timestamp || payload.dateAdded || new Date().toISOString()).toISOString(),
      contact_email_snapshot: contactEmail || null,
      contact_phone_snapshot: contactPhone || null,
      contact_name_snapshot: contactName || null,
    } as any;

    // Try to upsert contact first
    try {
      const contactUpsert = {
        account_id: account.id,
        ghl_contact_id: payload.contactId || null,
        first_name: contactName?.split(' ')?.[0] || null,
        last_name: contactName?.split(' ')?.slice(1).join(' ') || null,
        name: contactName || null,
        email: contactEmail || null,
        phone: contactPhone || null,
        source: contactSource || null,
        attribution_source: dialAttrSource || null,
        last_attribution_source: dialLastAttrSource || null,
        date_added: new Date().toISOString(), // Set current time as fallback
      }
      
      console.log('👤 Contact data for dial:', {
        hasGhlContactId: !!contactUpsert.ghl_contact_id,
        hasEmail: !!contactUpsert.email,
        hasPhone: !!contactUpsert.phone,
        hasName: !!contactUpsert.name,
        contactData: contactUpsert
      });
      
      if (contactUpsert.ghl_contact_id || contactUpsert.email || contactUpsert.phone) {
        console.log('📝 Upserting contact for dial...');
        const { data: up, error: upsertError } = await supabase
          .from('contacts')
          .upsert(contactUpsert, { onConflict: 'account_id,ghl_contact_id' })
          .select('id')
          .maybeSingle()
        
        if (upsertError) {
          console.error('❌ Contact upsert failed:', upsertError);
          
          // FUTURE-PROOF FALLBACK: Use the same API process as Sync Contacts button
          if (payload.contactId && typeof payload.contactId === 'string') {
            console.log('🔄 Attempting contact sync from GHL API as fallback...');
            const { syncSingleContactFromGHL } = await import('@/lib/ghl-contact-sync');
            const syncResult = await syncSingleContactFromGHL(account.id, payload.contactId);
            
            if (syncResult.success && syncResult.contactId) {
              dialData.contact_id = syncResult.contactId;
              console.log('✅ Contact synced from GHL and linked to dial:', syncResult.contactId);
            } else {
              console.log('⚠️ GHL contact sync also failed:', syncResult.error);
            }
          }
        } else if (up?.id) {
          dialData.contact_id = up.id
          console.log('✅ Contact linked to dial:', up.id);
        } else {
          console.log('⚠️ Contact upsert succeeded but no ID returned');
          
          // FUTURE-PROOF FALLBACK: Try GHL sync if we have a contact ID
          if (payload.contactId && typeof payload.contactId === 'string') {
            console.log('🔄 Attempting contact sync from GHL API as fallback...');
            const { syncSingleContactFromGHL } = await import('@/lib/ghl-contact-sync');
            const syncResult = await syncSingleContactFromGHL(account.id, payload.contactId);
            
            if (syncResult.success && syncResult.contactId) {
              dialData.contact_id = syncResult.contactId;
              console.log('✅ Contact synced from GHL and linked to dial:', syncResult.contactId);
            }
          }
        }
      } else {
        console.log('⚠️ No contact identifiers available - attempting GHL sync as last resort');
        
        // FUTURE-PROOF FALLBACK: Even without basic identifiers, try GHL sync if we have contact ID
        if (payload.contactId && typeof payload.contactId === 'string') {
          console.log('🔄 Attempting contact sync from GHL API...');
          const { syncSingleContactFromGHL } = await import('@/lib/ghl-contact-sync');
          const syncResult = await syncSingleContactFromGHL(account.id, payload.contactId);
          
          if (syncResult.success && syncResult.contactId) {
            dialData.contact_id = syncResult.contactId;
            console.log('✅ Contact synced from GHL and linked to dial:', syncResult.contactId);
          } else {
            console.log('⚠️ No contact data available for dial - will save without contact linking');
            console.log('📋 Missing contact data debug:', {
              rawPayload: {
                contactId: payload.contactId,
                userId: payload.userId,
                messageId: payload.messageId
              },
              fetchedData: {
                contactName,
                contactEmail, 
                contactPhone
              }
            });
          }
        } else {
          console.log('⚠️ No contact ID available - dial will be saved without contact linking');
        }
      }
    } catch (contactError) {
      console.error('❌ Error in contact upsert process:', contactError);
      
      // FUTURE-PROOF FALLBACK: Try GHL sync even after errors
      if (payload.contactId && typeof payload.contactId === 'string') {
        try {
          console.log('🔄 Attempting contact sync from GHL API after error...');
          const { syncSingleContactFromGHL } = await import('@/lib/ghl-contact-sync');
          const syncResult = await syncSingleContactFromGHL(account.id, payload.contactId);
          
          if (syncResult.success && syncResult.contactId) {
            dialData.contact_id = syncResult.contactId;
            console.log('✅ Contact synced from GHL after error and linked to dial:', syncResult.contactId);
          }
        } catch (syncError) {
          console.error('❌ GHL contact sync also failed:', syncError);
        }
      }
    }

    console.log('💾 Saving dial data:', {
      ...dialData,
      setter_info: setterName ? { name: setterName, email: setterEmail } : null
    });
    
    // Save to dials table
    const { data: savedDial, error: dialError } = await supabase
      .from('dials')
      .insert(sanitizeRecord(dialData))
      .select()
      .single();
    
    if (dialError) {
      console.error('Failed to save dial:', dialError);
      throw dialError;
    }
    
    console.log('✅ Dial saved successfully:', savedDial.id);
    
    // New: If the appointment already exists (dial arrived after appointment), link it here
    // FIXED: Only link appointments that happen AFTER the dial, within 30 minutes
    try {
      if (dialData.contact_id) {
        const dialTimeIso = dialData.date_called;
        if (dialTimeIso) {
          const dialTime = new Date(dialTimeIso);
          // Look for appointments within ±30 minutes of dial (appointment can be booked during call before hangup)
          const windowStart = new Date(dialTime.getTime() - 30 * 60 * 1000); // 30 minutes before dial
          const windowEnd = new Date(dialTime.getTime() + 30 * 60 * 1000); // 30 minutes after dial

          const { data: matchedAppts } = await supabase
            .from('appointments')
            .select('id, date_booked, contact_id')
            .eq('account_id', account.id)
            .eq('contact_id', dialData.contact_id)
            .gte('date_booked', windowStart.toISOString())
            .lte('date_booked', windowEnd.toISOString())
            .order('date_booked', { ascending: true })
            .limit(1)
          const matchedAppt = matchedAppts && matchedAppts.length > 0 ? matchedAppts[0] : null

          if (matchedAppt) {
            const minutesDiff = (new Date(matchedAppt.date_booked).getTime() - dialTime.getTime()) / (1000 * 60);
            const { error: updErr } = await supabase
              .from('dials')
              .update({ 
                booked: true, 
                booked_appointment_id: matchedAppt.id,
              })
              .eq('id', savedDial.id);
            if (updErr) {
              console.error('Failed to mark dial as booked/link appointment (dial-first path):', updErr);
            } else {
              console.log('🔗 Linked dial to existing appointment (dial-first path):', { 
                dialId: savedDial.id, 
                appointmentId: matchedAppt.id,
                minutesAfterDial: Math.round(minutesDiff * 10) / 10
              });
            }
          } else {
            console.log('ℹ️ No appointment found within ±30 minutes of dial for linking via contact_id');
          }
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
    
    // Find account by GHL location ID using the ghl_locations table
    const { data: locationData, error: locationError } = await supabase
      .from('ghl_locations')
      .select(`
        account_id,
        location_id,
        accounts!inner(
          id, 
          name, 
          ghl_location_id, 
          ghl_api_key
        )
      `)
      .eq('location_id', payload.locationId)
      .single();
    
    const account = locationData?.accounts as any;
    
    if (locationError || !account) {
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
    
    // Find account by GHL location ID using the ghl_locations table
    const { data: locationData, error: locationError } = await supabase
      .from('ghl_locations')
      .select(`
        account_id,
        location_id,
        accounts!inner(
          id, 
          name, 
          ghl_location_id, 
          ghl_api_key
        )
      `)
      .eq('location_id', payload.locationId)
      .single();
    
    const account = locationData?.accounts as any;
    
    if (locationError || !account) {
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

    // FIXED: Build query to find the most recent dial that could have led to this appointment
    // Look for dials within ±30 minutes of appointment (webhook timing can vary)
    const appointmentTime = new Date(appointmentOrDiscovery.date_booked || appointmentOrDiscovery.date_booked_for);
    const searchWindowStart = new Date(appointmentTime.getTime() - (30 * 60 * 1000)); // 30 minutes before appointment
    const searchWindowEnd = new Date(appointmentTime.getTime() + (30 * 60 * 1000)); // 30 minutes after appointment

    let dialQuery = supabase
      .from('dials')
      .select('id, date_called, email, phone, setter')
      .eq('account_id', accountId)
              .gte('date_called', searchWindowStart.toISOString()) // Within 30 minutes before appointment
        .lte('date_called', searchWindowEnd.toISOString()) // Within 30 minutes after appointment
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
      console.log('ℹ️ No recent dials found within ±30 minutes of appointment');
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

    // Link the dial to the appointment by updating booked status
    const { error: linkError } = await supabase
      .from('dials')
      .update({ 
        booked: true, 
        booked_appointment_id: appointmentOrDiscovery.id
      })
      .eq('id', relevantDial.id);

    if (linkError) {
      console.error('Failed to link dial to appointment:', linkError);
    } else {
      console.log('🔗 Successfully linked dial to appointment:', {
        dialId: relevantDial.id,
        appointmentId: appointmentOrDiscovery.id,
        setter: relevantDial.setter
      });
    }

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
          console.log(`✅ Found matching location! Adding location ID ${webhookLocationId} to account "${account.name}"`);
          
          // Insert into ghl_locations table
          const { error: insertError } = await supabase
            .from('ghl_locations')
            .insert({
              account_id: account.id,
              location_id: webhookLocationId,
              location_name: matchingLocation.name || null,
              is_primary: false
            });
          
          if (insertError) {
            console.error('❌ Failed to insert location ID:', insertError);
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

async function processContactUpsertWebhook(payload: any) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, serviceKey)

  const locationId = payload.locationId || payload.location_id
  if (!locationId) {
    console.warn('Contact webhook missing locationId')
    return
  }

  // Find account
  const { data: account } = await supabase
    .from('accounts')
    .select('id, name, ghl_api_key')
    .eq('ghl_location_id', locationId)
    .single()

  let resolvedAccount: any = account
  if (!resolvedAccount) {
    console.warn('Contact webhook for unknown location:', locationId)
    const recovered = await tryRecoverLocationId(supabase, locationId)
    if (!recovered) return
    resolvedAccount = recovered
  }

  const accountId: string = resolvedAccount.id as string

  // Prefer fetching the full contact from API for consistency
  let contact: any = null
  try {
    const contactId = payload.contactId || payload.id || payload.contact?.id
    if (contactId && account?.ghl_api_key) {
      const resp = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}`, {
        headers: {
          'Authorization': `Bearer ${account.ghl_api_key}`,
          'Version': '2021-07-28',
        },
      })
      if (resp.ok) {
        const json = await resp.json()
        contact = json.contact || json
      }
    }
  } catch (e) {
    console.warn('Fetch contact by id failed, will fallback to payload mapping')
  }

  // ENHANCE CONTACT WITH PROMETHEAN INTERNAL ATTRIBUTION
  let enhancedWithInternal = false;
  if (contact) {
    try {
      console.log('🎯 Attempting to enhance contact with Promethean internal attribution...');
      
      const enhanceResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.getpromethean.com'}/api/attribution/enhance-webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contact_id: contact.id,
          ghl_contact_data: contact,
          webhook_type: 'contact_upsert'
        })
      });

      if (enhanceResponse.ok) {
        const enhanceResult = await enhanceResponse.json();
        if (enhanceResult.enhanced) {
          enhancedWithInternal = true;
          console.log('✅ Successfully enhanced contact attribution with internal tracking:', {
            session_id: enhanceResult.session_id,
            attribution_quality: enhanceResult.attribution_quality,
            meta_ad_data: enhanceResult.meta_ad_data
          });
        } else {
          console.log('ℹ️ No internal attribution session found for contact enhancement');
        }
      } else {
        console.warn('⚠️ Failed to enhance contact with internal attribution:', enhanceResponse.status);
      }
    } catch (error) {
      console.error('❌ Error enhancing contact with internal attribution:', error);
      // Don't fail the main webhook for this
    }
  }

  const c = contact || payload.contact || payload
  if (!c) return

  const firstName = c.firstName || null
  const lastName = c.lastName || null
  const name = c.name || [firstName, lastName].filter(Boolean).join(' ') || null

  const row = {
    account_id: accountId,
    ghl_contact_id: c.id,
    first_name: firstName,
    last_name: lastName,
    name,
    email: c.email || null,
    phone: c.phone || null,
    source: c.source || null,
    timezone: c.timezone || null,
    assigned_to: c.assignedTo || null,
    date_added: c.dateAdded ? new Date(c.dateAdded).toISOString() : null,
    date_updated: c.dateUpdated ? new Date(c.dateUpdated).toISOString() : null,
    ghl_created_at: c.dateAdded ? new Date(c.dateAdded).toISOString() : new Date().toISOString(), // Capture GHL creation date
    tags: Array.isArray(c.tags) ? c.tags : [],
    attribution_source: c.attributionSource || null,
    last_attribution_source: c.lastAttributionSource || null,
    custom_fields: c.customFields || c.customField || null,
  }

  await supabase
    .from('contacts')
    .upsert(row, { onConflict: 'account_id,ghl_contact_id' })
}

// Helper to remove dropped columns to avoid schema errors after migration
function sanitizeRecord<T extends Record<string, any>>(obj: T): T {
  const droppedKeys = new Set([
    'contact_name','email','phone',
    'contact_source','contact_utm_source','contact_utm_medium','contact_utm_campaign','contact_utm_content','contact_referrer','contact_gclid','contact_fbclid','contact_campaign_id','last_attribution_source',
    'utm_source','utm_medium','utm_campaign','utm_content','utm_term','utm_id',
    'fbclid','fbc','fbp','landing_url','session_source','medium_id','user_agent','ip_address',
    'attribution_data','last_attribution_data'
  ])
  const cleaned: any = {}
  for (const [k, v] of Object.entries(obj)) {
    if (!droppedKeys.has(k)) cleaned[k] = v
  }
  return cleaned
}

// Export for use by backfill API
export { processAppointmentWebhook }