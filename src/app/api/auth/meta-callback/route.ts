import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  
  // DETAILED LOGGING FOR VERCEL
  console.log('=== META ADS OAUTH CALLBACK START ===');
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
    console.log('❌ OAuth error from Meta:', error);
    console.log('=== OAUTH CALLBACK END (ERROR FROM META) ===');
    return NextResponse.redirect(`${baseUrl}/account/meta-ads-connection?error=${error}`);
  }
  
  if (!code) {
    console.log('❌ MISSING CODE PARAMETER - DETAILED ANALYSIS:');
    console.log('  - Code present:', !!code, code ? 'YES' : 'NO');
    console.log('  - All search params:', Object.fromEntries(searchParams.entries()));
    console.log('=== OAUTH CALLBACK END (MISSING CODE) ===');
    return NextResponse.redirect(`${baseUrl}/account/meta-ads-connection?error=missing_parameters`);
  }

  // Handle missing state parameter from Meta
  let stateData: { accountId: string; nonce: string; userId?: string };
  
  if (!state) {
    console.log('⚠️ STATE PARAMETER MISSING - Meta did not return state parameter');
    console.log('🔄 Attempting to recover account info from cookies and localStorage...');
    
    // Try to recover from cookies first
    const cookieStore = await cookies();
    const cookieAccountId = cookieStore.get('selectedAccountId')?.value;
    const cookieUserId = cookieStore.get('oauth_userId')?.value;
    
    console.log('🔍 Cookie recovery attempt:', {
      cookieAccountId: cookieAccountId ? `${cookieAccountId.substring(0, 10)}...` : null,
      cookieUserId: cookieUserId ? `${cookieUserId.substring(0, 10)}...` : null,
      allCookies: cookieStore.getAll().map((c: any) => c.name)
    });
    
    if (cookieAccountId && cookieUserId) {
      stateData = {
        accountId: cookieAccountId,
        nonce: '',
        userId: cookieUserId
      };
      console.log('✅ Successfully recovered state from cookies:', {
        accountId: stateData.accountId,
        userId: stateData.userId
      });
    } else {
      console.log('❌ Could not recover state from cookies');
      console.log('=== OAUTH CALLBACK END (MISSING ACCOUNT INFO) ===');
      return NextResponse.redirect(`${baseUrl}/account/meta-ads-connection?error=missing_account_info`);
    }
  } else {
    // Parse and validate state normally
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
        return NextResponse.redirect(`${baseUrl}/account/meta-ads-connection?error=invalid_state`);
      }
    }
  }

  // TODO: Validate nonce against stored value for full CSRF protection
  
  // Fix environment variable names to match what's actually available
  const clientId = process.env.META_APP_ID || process.env.NEXT_PUBLIC_META_APP_ID;
  const clientSecret = process.env.META_APP_SECRET;
  const redirectUri = process.env.META_REDIRECT_URI || `${baseUrl}/api/auth/meta-callback`;
  
  console.log('🔍 ENVIRONMENT VARIABLES CHECK:');
  console.log('  - META_APP_ID:', process.env.META_APP_ID ? 'SET' : 'NOT SET');
  console.log('  - NEXT_PUBLIC_META_APP_ID:', process.env.NEXT_PUBLIC_META_APP_ID ? 'SET' : 'NOT SET');
  console.log('  - META_APP_SECRET:', process.env.META_APP_SECRET ? 'SET' : 'NOT SET');
  console.log('  - META_REDIRECT_URI:', process.env.META_REDIRECT_URI ? 'SET' : 'NOT SET');
  console.log('  - Final clientId:', clientId ? `${clientId.substring(0, 20)}...` : 'NULL');
  console.log('  - Final clientSecret:', clientSecret ? 'SET' : 'NULL');
  console.log('  - Final redirectUri:', redirectUri);

  if (!clientId || !clientSecret) {
    console.log('❌ Missing Meta client configuration');
    console.log('=== OAUTH CALLBACK END (CONFIGURATION ERROR) ===');
    return NextResponse.redirect(`${baseUrl}/account/meta-ads-connection?error=configuration_error`);
  }

  console.log('🔄 Attempting to exchange code for access token...');

  // Exchange authorization code for access token
  try {
    const tokenResponse = await fetch('https://graph.facebook.com/v21.0/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: code,
      }),
    });

    console.log('🔍 Token exchange response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.log('❌ Token exchange failed:', errorText);
      console.log('=== OAUTH CALLBACK END (TOKEN EXCHANGE FAILED) ===');
      return NextResponse.redirect(`${baseUrl}/account/meta-ads-connection?error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();
    console.log('✅ Token exchange successful:', {
      hasAccessToken: !!tokenData.access_token,
      tokenType: tokenData.token_type,
      expiresIn: tokenData.expires_in
    });

    // Get user information
    const userResponse = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${tokenData.access_token}`);
    const userData = await userResponse.json();
    
    console.log('🔍 User data retrieved:', {
      userId: userData.id,
      userName: userData.name
    });

    // Save to database
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('🔄 Saving Meta Ads connection to database...');

    // Calculate token expiration
    const expiresAt = tokenData.expires_in 
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null;

    // Update the account with Meta Ads connection info
    const { error: dbError } = await supabase
      .from('accounts')
      .update({
        meta_access_token: tokenData.access_token,
        meta_user_id: userData.id,
        meta_auth_type: 'oauth2',
        meta_token_expires_at: expiresAt,
        meta_token_health_status: 'healthy',
        meta_token_last_refreshed: new Date().toISOString(),
      })
      .eq('id', stateData.accountId);

    if (dbError) {
      console.log('❌ Database save failed:', dbError);
      console.log('=== OAUTH CALLBACK END (DATABASE ERROR) ===');
      return NextResponse.redirect(`${baseUrl}/account/meta-ads-connection?error=database_error`);
    }

    console.log('✅ Meta Ads connection saved successfully');
    console.log('=== OAUTH CALLBACK END (SUCCESS) ===');

    // Redirect to success page
    return NextResponse.redirect(`${baseUrl}/account/meta-ads-connection?success=true`);

  } catch (error) {
    console.log('❌ Unexpected error during token exchange:', error);
    console.log('=== OAUTH CALLBACK END (UNKNOWN ERROR) ===');
    return NextResponse.redirect(`${baseUrl}/account/meta-ads-connection?error=unknown_error`);
  }
} 