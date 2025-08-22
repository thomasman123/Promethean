import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const accountId = url.searchParams.get('accountId')
  if (!accountId) {
    return NextResponse.json({ error: 'accountId required' }, { status: 400 })
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set() {},
        remove() {},
      },
    }
  )

  // Verify user has access to this account
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user is global admin OR has any account access
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isGlobalAdmin = profile?.role === 'admin'
  
  if (!isGlobalAdmin) {
    const { data: access } = await supabase
      .from('account_access')
      .select('role')
      .eq('user_id', user.id)
      .eq('account_id', accountId)
      .eq('is_active', true)
      .single()

    if (!access) {
      return NextResponse.json({ error: 'No access to this account' }, { status: 403 })
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
  const state = JSON.stringify({ accountId, nonce, userId: user.id })

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

  return NextResponse.redirect(authUrl.toString())
} 