import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configure maximum duration for this endpoint
export const maxDuration = 60; // 60 seconds

// Helper to get valid GHL access token (same as webhook logic)
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

    console.log('✅ GHL access token refreshed successfully');
    return newAccessToken;
  } catch (error) {
    console.error('❌ Error refreshing GHL access token:', error);
    return account.ghl_api_key || null;
  }
}

// Helper to fetch GHL user details
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
      console.log('✅ User data retrieved via individual endpoint');
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
        console.log('✅ User data retrieved via location users endpoint');
        return userData;
      }
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error fetching user from GHL:', error);
    return null;
  }
}

// Process a single call message (same logic as webhook)
async function processCallMessage(message: any, account: any, accessToken: string, supabase: any) {
  try {
    // Skip inbound calls early
    if (message.direction !== 'outbound') {
      return { success: false, reason: 'inbound' };
    }

    console.log('📞 Processing call:', message.id);

    // Extract call data from message
    const contactId = message.contactId;
    const userId = message.userId; // userId is at root level, NOT in meta
    
    // Get duration from meta.call.duration (nested structure!)
    const rawDuration = message.meta?.call?.duration;
    const callDuration = rawDuration ? (typeof rawDuration === 'number' ? rawDuration : parseInt(rawDuration)) : 0;
    
    const callStatus = message.meta?.call?.status || message.status;
    const direction = message.direction;
    const dateAdded = message.dateAdded;
    const recordingUrl = message.attachments?.[0] || null;

    // Debug log
    console.log('📋 Call data:', {
      id: message.id,
      userId,
      callDuration,
      rawDuration,
      callStatus,
      hasRecording: !!recordingUrl,
      metaCall: message.meta?.call
    });

    // Fetch contact information
    let contactEmail = null;
    let contactPhone = null;
    let contactName = null;
    let contactSource = null;

    if (contactId) {
      try {
        const contactResponse = await fetch(
          `https://services.leadconnectorhq.com/contacts/${contactId}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Version': '2021-07-28',
            },
          }
        );

        if (contactResponse.ok) {
          const contactData = await contactResponse.json();
          const contact = contactData.contact || contactData;
          contactEmail = contact.email;
          contactPhone = contact.phone;
          contactName = contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
          contactSource = contact.source;
        }
      } catch (e) {
        console.error('Error fetching contact:', e);
      }
    }

    // Fetch setter information from GHL
    let setterName = 'Unknown';
    let linkedSetterUserId = null;
    let setterEmail = null;

    if (userId) {
      const setterData = await fetchGhlUserDetails(userId, accessToken, account.ghl_location_id);
      
      if (setterData) {
        setterName = setterData.name || `${setterData.firstName || ''} ${setterData.lastName || ''}`.trim() || 'Unknown';
        setterEmail = setterData.email;

        console.log('👤 Setter details:', { name: setterName, email: setterEmail });

        // Link to platform user by email (check profiles table, not users)
        if (setterEmail) {
          const { data: matchedProfiles } = await supabase
            .from('profiles')
            .select('id, email')
            .ilike('email', setterEmail)
            .limit(1);

          if (matchedProfiles && matchedProfiles.length > 0) {
            linkedSetterUserId = matchedProfiles[0].id;
            console.log('✅ Linked setter to platform user:', linkedSetterUserId);
          } else {
            console.log('⚠️ No platform user found for email:', setterEmail);
          }
        }
      }
    }

    // Prepare dial data with same logic as webhook
    // Answered is simply duration > 30 seconds (regardless of callStatus)
    // Meaningful conversation is duration > 120 seconds
    const dialData = {
      account_id: account.id,
      setter: setterName,
      setter_user_id: linkedSetterUserId,
      duration: callDuration,
      call_recording_link: recordingUrl,
      answered: callDuration > 30,
      meaningful_conversation: callDuration > 120,
      date_called: new Date(dateAdded).toISOString(),
      contact_email_snapshot: contactEmail,
      contact_phone_snapshot: contactPhone,
      contact_name_snapshot: contactName,
      ghl_message_id: message.id, // Track GHL message ID for idempotency
    } as any;

    // Try to upsert contact first
    try {
      const contactUpsert = {
        account_id: account.id,
        ghl_contact_id: contactId || null,
        first_name: contactName?.split(' ')?.[0] || null,
        last_name: contactName?.split(' ')?.slice(1).join(' ') || null,
        name: contactName || null,
        email: contactEmail || null,
        phone: contactPhone || null,
        source: contactSource || null,
        date_added: new Date().toISOString(),
      };

      if (contactUpsert.ghl_contact_id || contactUpsert.email || contactUpsert.phone) {
        const { data: up, error: upsertError } = await supabase
          .from('contacts')
          .upsert(contactUpsert, { onConflict: 'account_id,ghl_contact_id' })
          .select('id')
          .maybeSingle();

        if (!upsertError && up?.id) {
          dialData.contact_id = up.id;
          console.log('✅ Contact linked to dial:', up.id);
        }
      }
    } catch (contactError) {
      console.error('❌ Error in contact upsert:', contactError);
    }

    // Delete existing dial with same ghl_message_id, then insert
    // This approach works better than upsert for partial unique indexes
    if (dialData.ghl_message_id) {
      await supabase
        .from('dials')
        .delete()
        .eq('account_id', account.id)
        .eq('ghl_message_id', dialData.ghl_message_id);
    }

    // Insert the dial
    const { data: savedDial, error: dialError } = await supabase
      .from('dials')
      .insert(dialData)
      .select()
      .single();

    if (dialError) {
      console.error('❌ Failed to save dial:', dialError);
      throw dialError;
    }

    console.log('✅ Dial saved/updated successfully:', savedDial.id);

    // Link to appointments within ±30 minutes (same logic as webhook)
    try {
      if (dialData.contact_id) {
        const dialTimeIso = dialData.date_called;
        if (dialTimeIso) {
          const dialTime = new Date(dialTimeIso);
          const windowStart = new Date(dialTime.getTime() - 30 * 60 * 1000);
          const windowEnd = new Date(dialTime.getTime() + 30 * 60 * 1000);

          const { data: matchedAppts } = await supabase
            .from('appointments')
            .select('id, date_booked, contact_id')
            .eq('account_id', account.id)
            .eq('contact_id', dialData.contact_id)
            .gte('date_booked', windowStart.toISOString())
            .lte('date_booked', windowEnd.toISOString())
            .order('date_booked', { ascending: true })
            .limit(1);

          const matchedAppt = matchedAppts && matchedAppts.length > 0 ? matchedAppts[0] : null;

          if (matchedAppt) {
            const { error: updErr } = await supabase
              .from('dials')
              .update({
                booked: true,
                booked_appointment_id: matchedAppt.id,
              })
              .eq('id', savedDial.id);

            if (!updErr) {
              console.log('🔗 Linked dial to appointment:', matchedAppt.id);
            }
          }
        }
      }
    } catch (e) {
      console.error('Error linking dial to appointment:', e);
    }

    return { success: true, dialId: savedDial.id };
  } catch (error) {
    console.error('Error processing call message:', error);
    return { success: false, reason: 'error', error };
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get user from auth
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    // Get request body
    const { accountId, startDate, endDate, skip = 0, batchSize = 50 } = await request.json();

    if (!accountId || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get account
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (!account.ghl_location_id) {
      return NextResponse.json({ error: 'Account not connected to GHL' }, { status: 400 });
    }

    // Get valid access token
    const accessToken = await getValidGhlAccessToken(account, supabase);
    if (!accessToken) {
      return NextResponse.json({ error: 'No valid GHL access token' }, { status: 400 });
    }

    console.log('🚀 Starting call backfill for account:', accountId);
    console.log('📅 Date range:', startDate, 'to', endDate);

    // Fetch all outbound calls from GHL Export Messages API
    const allCalls = [];
    let cursor = null;
    let hasMorePages = true;
    let pageCount = 0;

    while (hasMorePages) {
      pageCount++;
      console.log(`📥 Fetching page ${pageCount}...`);

      const params = new URLSearchParams({
        locationId: account.ghl_location_id,
        channel: 'Call',
        startDate: startDate,
        endDate: endDate,
        limit: '500', // Max allowed by API
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      if (cursor) {
        params.append('cursor', cursor);
      }

      const url = `https://services.leadconnectorhq.com/conversations/messages/export?${params}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Version': '2021-04-15',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to fetch messages:', response.status, errorText);
        return NextResponse.json(
          { error: `Failed to fetch messages: ${response.status}` },
          { status: 500 }
        );
      }

      const data = await response.json();
      const messages = data.messages || [];

      console.log(`✅ Fetched ${messages.length} messages`);
      
      // Log full response on first page for debugging
      if (pageCount === 1) {
        console.log('📋 FULL API RESPONSE STRUCTURE:', JSON.stringify({
          total: data.total,
          messageCount: messages.length,
          hasNextCursor: !!data.nextCursor,
          firstMessage: messages.length > 0 ? messages[0] : null
        }, null, 2));
      }

      allCalls.push(...messages);

      cursor = data.nextCursor;
      hasMorePages = !!cursor && messages.length > 0;

      // Respect cursor validity (2 minutes), but we process fast enough
    }

    console.log(`📊 Total calls fetched: ${allCalls.length}`);

    // Filter for outbound calls only
    const outboundCalls = allCalls.filter(msg => msg.direction === 'outbound');
    console.log(`📊 Outbound calls: ${outboundCalls.length}`);
    
    // Apply batch processing
    const totalOutbound = outboundCalls.length;
    const callsToProcess = outboundCalls.slice(skip, skip + batchSize);
    const hasMore = (skip + batchSize) < totalOutbound;
    
    console.log(`📊 Processing batch: ${skip + 1} to ${skip + callsToProcess.length} of ${totalOutbound} (batchSize: ${batchSize})`);
    if (hasMore) {
      console.log(`⏭️ More calls remaining: ${totalOutbound - (skip + batchSize)} will need follow-up request`);
    }

    // Process each call in the batch
    const results = {
      total: totalOutbound,
      batchTotal: callsToProcess.length,
      batchStart: skip,
      batchEnd: skip + callsToProcess.length,
      hasMore,
      nextSkip: hasMore ? skip + batchSize : null,
      processed: 0,
      skipped: 0,
      errors: 0,
      duplicates: 0,
      inbound: 0
    };

    let processedCount = 0;
    for (const call of callsToProcess) {
      const result = await processCallMessage(call, account, accessToken, supabase);

      processedCount++;
      
      if (result.success) {
        results.processed++;
      } else if (result.reason === 'duplicate') {
        results.duplicates++;
        results.skipped++;
      } else if (result.reason === 'inbound') {
        results.inbound++;
        results.skipped++;
      } else {
        results.errors++;
        results.skipped++;
      }
      
      // Log progress every 100 calls
      if (processedCount % 100 === 0) {
        console.log(`📊 Progress: ${processedCount}/${callsToProcess.length} calls processed in this batch`);
      }
    }

    console.log('✅ Backfill batch complete:', results);
    console.log(`🎯 Returning response - hasMore: ${results.hasMore}, nextSkip: ${results.nextSkip}`);

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('❌ Error in backfill-calls:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

