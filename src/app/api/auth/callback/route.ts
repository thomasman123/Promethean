import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  
  // DETAILED LOGGING FOR VERCEL
  console.log('=== GHL OAUTH CALLBACK START ===');
  console.log('🔍 OAuth callback received:', { 
    hasCode: !!code, 
    hasState: !!state, 
    error,
    fullUrl: request.url,
    searchParamsAll: Object.fromEntries(searchParams.entries())
  });
  console.log('🔍 Raw parameters:', {
    code: code ? `${code.substring(0, 10)}...` : null,
    state: state ? `${state.substring(0, 50)}...` : null,
    error
  });
  
  // Get the base URL for absolute redirects
  const baseUrl = request.nextUrl.origin;
  console.log('🔍 Base URL:', baseUrl);
  
  if (error) {
    console.log('❌ OAuth error from GHL:', error);
    console.log('=== OAUTH CALLBACK END (ERROR FROM GHL) ===');
    return NextResponse.redirect(`${baseUrl}/account/ghl-connection?error=${error}`);
  }
  
  if (!code || !state) {
    console.log('❌ MISSING PARAMETERS - DETAILED ANALYSIS:');
    console.log('  - Code present:', !!code, code ? 'YES' : 'NO');
    console.log('  - State present:', !!state, state ? 'YES' : 'NO');
    console.log('  - All search params:', Object.fromEntries(searchParams.entries()));
    console.log('  - Request method:', request.method);
    console.log('  - Request headers:', Object.fromEntries(request.headers.entries()));
    console.log('=== OAUTH CALLBACK END (MISSING PARAMS) ===');
    return NextResponse.redirect(`${baseUrl}/account/ghl-connection?error=missing_parameters`);
  }

  // Parse and validate state
  let stateData: { accountId: string; nonce: string; userId?: string };
  try {
    console.log('🔍 Attempting to parse state:', state);
    stateData = JSON.parse(state);
    console.log('✅ Parsed state successfully:', { 
      accountId: stateData.accountId, 
      hasNonce: !!stateData.nonce,
      userId: stateData.userId 
    });
    if (!stateData.accountId || !stateData.nonce) {
      throw new Error('Invalid state structure');
    }
  } catch (e) {
    console.log('❌ State parsing failed:', e);
    console.log('🔄 Trying legacy format...');
    // Fallback for legacy state format (just accountId)
    if (typeof state === 'string' && state.length > 10) {
      stateData = { accountId: state, nonce: '' };
      console.log('✅ Using legacy state format:', stateData.accountId);
    } else {
      console.log('❌ Legacy format also failed');
      console.log('=== OAUTH CALLBACK END (INVALID STATE) ===');
      return NextResponse.redirect(`${baseUrl}/account/ghl-connection?error=invalid_state`);
    }
  }

  // TODO: Validate nonce against stored value for full CSRF protection
  
  // Fix environment variable names to match what's actually available
  const clientId = process.env.GHL_CLIENT_ID || process.env.NEXT_PUBLIC_GHL_CLIENT_ID;
  const clientSecret = process.env.GHL_CLIENT_SECRET;
  const redirectUri = process.env.GHL_REDIRECT_URI || `${baseUrl}/api/auth/callback`;
  
  console.log('🔍 ENVIRONMENT VARIABLES CHECK:');
  console.log('  - GHL_CLIENT_ID:', process.env.GHL_CLIENT_ID ? 'SET' : 'NOT SET');
  console.log('  - NEXT_PUBLIC_GHL_CLIENT_ID:', process.env.NEXT_PUBLIC_GHL_CLIENT_ID ? 'SET' : 'NOT SET');
  console.log('  - GHL_CLIENT_SECRET:', process.env.GHL_CLIENT_SECRET ? 'SET' : 'NOT SET');
  console.log('  - GHL_REDIRECT_URI:', process.env.GHL_REDIRECT_URI ? 'SET' : 'NOT SET');
  console.log('  - Final clientId:', clientId ? `${clientId.substring(0, 20)}...` : 'NULL');
  console.log('  - Final clientSecret:', clientSecret ? 'SET' : 'NULL');
  console.log('  - Final redirectUri:', redirectUri);
  
  if (!clientId || !clientSecret) {
    console.log('❌ MISSING OAUTH CONFIG DETAILS:');
    console.log('  - Missing clientId:', !clientId);
    console.log('  - Missing clientSecret:', !clientSecret);
    console.log('  - Available env vars:', Object.keys(process.env).filter(key => key.includes('GHL')));
    console.log('=== OAUTH CALLBACK END (CONFIG ERROR) ===');
    return NextResponse.redirect(`${baseUrl}/account/ghl-connection?error=configuration_error`);
  }
  
  try {
    console.log('🔄 STARTING TOKEN EXCHANGE...');
    console.log('🔍 Token exchange parameters:');
    console.log('  - URL: https://services.leadconnectorhq.com/oauth/token');
    console.log('  - client_id:', clientId ? `${clientId.substring(0, 20)}...` : 'NULL');
    console.log('  - client_secret:', clientSecret ? 'SET' : 'NULL');
    console.log('  - grant_type: authorization_code');
    console.log('  - code:', code ? `${code.substring(0, 10)}...` : 'NULL');
    console.log('  - user_type: Location');
    console.log('  - redirect_uri:', redirectUri);
    
    // Exchange authorization code for access token using correct GoHighLevel endpoint
    // Following the exact format from GHL OAuth 2.0 documentation
    const tokenResponse = await fetch('https://services.leadconnectorhq.com/oauth/token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        user_type: 'Location', // Add user_type as shown in GHL docs
        redirect_uri: redirectUri,
      }),
    });
    
    console.log('🔍 Token response status:', tokenResponse.status, tokenResponse.statusText);
    console.log('🔍 Token response headers:', Object.fromEntries(tokenResponse.headers.entries()));
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('❌ TOKEN EXCHANGE FAILED - DETAILED ERROR:');
      console.error('  - Status:', tokenResponse.status);
      console.error('  - Status Text:', tokenResponse.statusText);
      console.error('  - Response Body:', errorText);
      console.error('  - Response Headers:', Object.fromEntries(tokenResponse.headers.entries()));
      
      // Try to parse as JSON if possible
      try {
        const errorJson = JSON.parse(errorText);
        console.error('  - Parsed Error JSON:', errorJson);
      } catch {
        console.error('  - Error response is not JSON');
      }
      
      console.log('=== OAUTH CALLBACK END (TOKEN EXCHANGE FAILED) ===');
      return NextResponse.redirect(`${baseUrl}/account/ghl-connection?error=token_exchange_failed`);
    }
    
    const tokenData = await tokenResponse.json();
    console.log('✅ TOKEN EXCHANGE SUCCESSFUL!');
    console.log('🔍 Token data received:', {
      locationId: tokenData.locationId,
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
      userType: tokenData.userType,
      scope: tokenData.scope,
      companyId: tokenData.companyId
    });
    
    // Store the OAuth tokens in the accounts table
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    console.log('🔍 SUPABASE CONFIG CHECK:');
    console.log('  - NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'SET' : 'NOT SET');
    console.log('  - SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'SET' : 'NOT SET');
    
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('💾 UPDATING ACCOUNT IN DATABASE...');
    console.log('  - Account ID:', stateData.accountId);
    console.log('  - Location ID:', tokenData.locationId);
    console.log('  - Token expires in:', tokenData.expires_in, 'seconds');
    
    const updateData = {
      ghl_api_key: tokenData.access_token, // Store access token
      ghl_refresh_token: tokenData.refresh_token, // Store refresh token
      ghl_location_id: tokenData.locationId, // Store the location ID
      ghl_auth_type: 'oauth2', // Mark as OAuth
      ghl_token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
      ghl_webhook_id: null, // Will be set by webhook subscription
      future_sync_enabled: true, // Automatically enable future sync
      future_sync_started_at: new Date().toISOString(), // Record when sync started
    };
    
    console.log('🔍 Database update data:', {
      ...updateData,
      ghl_api_key: updateData.ghl_api_key ? `${updateData.ghl_api_key.substring(0, 20)}...` : 'NULL',
      ghl_refresh_token: updateData.ghl_refresh_token ? `${updateData.ghl_refresh_token.substring(0, 20)}...` : 'NULL'
    });
    
    const { error: updateError } = await supabaseService
      .from('accounts')
      .update(updateData)
      .eq('id', stateData.accountId);
    
    if (updateError) {
      console.error('❌ DATABASE UPDATE FAILED:');
      console.error('  - Error:', updateError);
      console.error('  - Account ID:', stateData.accountId);
      console.log('=== OAUTH CALLBACK END (DATABASE ERROR) ===');
      return NextResponse.redirect(`${baseUrl}/account/ghl-connection?error=database_error&detail=${encodeURIComponent(updateError.message)}`);
    }
    
    console.log('✅ DATABASE UPDATE SUCCESSFUL!');
    console.log('✅ OAUTH FLOW COMPLETED SUCCESSFULLY!');
    console.log('=== OAUTH CALLBACK END (SUCCESS) ===');
    return NextResponse.redirect(`${baseUrl}/account/ghl-connection?success=true&webhook=skipped`);
  } catch (error) {
    console.error('❌ OAUTH CALLBACK EXCEPTION:');
    console.error('  - Error:', error);
    console.error('  - Stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.log('=== OAUTH CALLBACK END (EXCEPTION) ===');
    return NextResponse.redirect(`${baseUrl}/account/ghl-connection?error=unknown_error`);
  }
} 