import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const accountId = url.searchParams.get('accountId')
  if (!accountId) {
    return NextResponse.json({ error: 'accountId required' }, { status: 400 })
  }

  // Use service role to bypass RLS for user validation
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get user from Authorization header or session
  const authHeader = request.headers.get('authorization')
  const sessionToken = request.cookies.get('sb-access-token')?.value || 
                      request.cookies.get('supabase-auth-token')?.value ||
                      authHeader?.replace('Bearer ', '')

  if (!sessionToken) {
    console.log('🔍 No session token found in cookies or auth header')
    return NextResponse.json({ error: 'No session token' }, { status: 401 })
  }

  // Verify the JWT token
  let userId: string
  try {
    const { data: { user }, error } = await supabase.auth.getUser(sessionToken)
    if (error || !user) {
      console.log('🔍 Token validation failed:', error?.message)
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }
    userId = user.id
    console.log('🔍 Auth success:', { userId })
  } catch (e) {
    console.log('🔍 Auth exception:', e)
    return NextResponse.json({ error: 'Auth validation failed' }, { status: 401 })
  }

  // Check if user is global admin OR has admin/moderator account access
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  const isGlobalAdmin = profile?.role === 'admin'
  console.log('🔍 Profile debug:', { userId, profileRole: profile?.role, isGlobalAdmin })
  
  if (!isGlobalAdmin) {
    const { data: access } = await supabase
      .from('account_access')
      .select('role')
      .eq('user_id', userId)
      .eq('account_id', accountId)
      .eq('is_active', true)
      .single()

    console.log('🔍 Account access debug:', { userId, accountId, access: access?.role })

    if (!access || !['admin', 'moderator'].includes(access.role)) {
      return NextResponse.json({ error: 'Insufficient permissions - need admin or moderator role' }, { status: 403 })
    }
  }

  const baseUrl = request.nextUrl.origin
  const clientId = process.env.GHL_CLIENT_ID
  const redirectUri = process.env.GHL_REDIRECT_URI || `${baseUrl}/api/auth/callback`
  
  if (!clientId) {
    return NextResponse.json({ error: 'GHL client id not configured' }, { status: 500 })
  }

  // Generate CSRF nonce and store it temporarily
  const nonce = randomBytes(16).toString('hex')
  const state = JSON.stringify({ accountId, nonce, userId })

  // TODO: Store nonce in cache/session for verification in callback
  // For now, we'll include userId in state for basic validation

  // Minimal scopes - start with just what we need
  const scope = 'locations.readonly calendars.readonly contacts.readonly webhooks.write'
  
  // Try marketplace.gohighlevel.com first, fallback to leadconnectorhq for white-label
  const authUrl = new URL('https://marketplace.gohighlevel.com/oauth/chooselocation')
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', scope)
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('loginWindowOpenMode', 'self')

  console.log('🔍 Redirecting to:', authUrl.toString())
  return NextResponse.redirect(authUrl.toString())
} 