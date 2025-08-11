import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // This is our accountId
  const error = searchParams.get('error');
  
  // Get the base URL for absolute redirects
  const baseUrl = request.nextUrl.origin;
  
  if (error) {
    return NextResponse.redirect(`${baseUrl}/account/crm-connection?error=${error}`);
  }
  
  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/account/crm-connection?error=missing_parameters`);
  }
  
  const clientId = process.env.GHL_CLIENT_ID;
  const clientSecret = process.env.GHL_CLIENT_SECRET;
  const redirectUri = process.env.GHL_REDIRECT_URI || `${baseUrl}/api/auth/callback`;
  
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${baseUrl}/account/crm-connection?error=configuration_error`);
  }
  
  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://services.leadconnectorhq.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Token exchange failed:', errorData);
      return NextResponse.redirect(`${baseUrl}/account/crm-connection?error=token_exchange_failed`);
    }
    
    const tokenData = await tokenResponse.json();
    console.log('Token exchange successful:', {
      locationId: tokenData.locationId,
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      expiresIn: tokenData.expires_in
    });
    
    // Auto-subscribe to webhooks for phone call and appointment capture
    let webhookId = null;
    try {
      const webhookUrl = `${baseUrl}/api/webhooks`;
      
      console.log(`📡 Auto-subscribing webhook for location ${tokenData.locationId}: ${webhookUrl}`);
      
      // Try multiple webhook API approaches
      let webhookResponse = null;
      let webhookSuccess = false;
      
      const webhookAttempts = [
        {
          name: 'Location-based endpoint',
          url: `https://services.leadconnectorhq.com/locations/${tokenData.locationId}/webhooks`,
          body: { url: webhookUrl, events: ['OutboundMessage', 'AppointmentCreate', 'AppointmentUpdate', 'AppointmentDelete'] }
        },
        {
          name: 'V2 webhooks with locationId',
          url: 'https://services.leadconnectorhq.com/v2/webhooks',
          body: { locationId: tokenData.locationId, url: webhookUrl, events: ['OutboundMessage', 'AppointmentCreate', 'AppointmentUpdate', 'AppointmentDelete'] }
        },
        {
          name: 'V1 webhooks endpoint', 
          url: 'https://services.leadconnectorhq.com/webhooks',
          body: { locationId: tokenData.locationId, url: webhookUrl, events: ['OutboundMessage', 'AppointmentCreate', 'AppointmentUpdate', 'AppointmentDelete'] }
        }
      ];
      
      for (const attempt of webhookAttempts) {
        console.log(`🧪 Trying webhook approach: ${attempt.name}`);
        
        try {
          webhookResponse = await fetch(attempt.url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${tokenData.access_token}`,
              'Version': '2021-04-15',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(attempt.body),
          });
          
          console.log(`📞 ${attempt.name} response status: ${webhookResponse.status}`);
          
          if (webhookResponse.ok) {
            console.log(`✅ Webhook subscription successful with: ${attempt.name}`);
            webhookSuccess = true;
            break;
          } else {
            const errorText = await webhookResponse.text();
            console.log(`❌ ${attempt.name} failed: ${errorText}`);
          }
        } catch (error) {
          console.log(`❌ ${attempt.name} error:`, error);
        }
      }
      
      if (webhookSuccess && webhookResponse) {
        const webhookData = await webhookResponse.json();
        webhookId = webhookData.id;
        console.log(`✅ Webhook subscribed successfully:`, webhookId);
      } else {
        console.error(`❌ All webhook subscription attempts failed`);
      }
    } catch (webhookError) {
      console.error(`⚠️ Webhook subscription exception:`, webhookError);
      // Don't fail the OAuth flow if webhook subscription fails
    }
    
    // Store the OAuth tokens in the accounts table
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, serviceKey);
    
    console.log('Updating account:', state, 'with OAuth tokens');
    
    const { error: updateError } = await supabase
      .from('accounts')
      .update({
        ghl_api_key: tokenData.access_token, // Store access token
        ghl_refresh_token: tokenData.refresh_token, // Store refresh token
        ghl_location_id: tokenData.locationId, // Store the location ID
        ghl_auth_type: 'oauth2', // Mark as OAuth
        ghl_token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        ghl_webhook_id: webhookId, // Store webhook ID for tracking
        future_sync_enabled: true, // Automatically enable future sync
        future_sync_started_at: new Date().toISOString(), // Record when sync started
      })
      .eq('id', state); // state contains the accountId
    
    if (updateError) {
      console.error('Database update error:', updateError);
      return NextResponse.redirect(`${baseUrl}/account/crm-connection?error=database_error&detail=${encodeURIComponent(updateError.message)}`);
    }
    
    console.log('✅ Account updated successfully with webhook ID:', webhookId);
    return NextResponse.redirect(`${baseUrl}/account/crm-connection?success=true&webhook=${webhookId ? 'active' : 'failed'}`);
  } catch (error) {
    console.error('❌ OAuth callback error:', error);
    return NextResponse.redirect(`${baseUrl}/account/crm-connection?error=unknown_error`);
  }
} 