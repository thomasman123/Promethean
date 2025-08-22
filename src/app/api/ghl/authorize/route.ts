import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const accountId = url.searchParams.get('accountId')
  if (!accountId) {
    return NextResponse.json({ error: 'accountId required' }, { status: 400 })
  }

  const baseUrl = request.nextUrl.origin
  const clientId = process.env.NEXT_PUBLIC_GHL_CLIENT_ID || process.env.GHL_CLIENT_ID
  const redirectUri = process.env.NEXT_PUBLIC_GHL_REDIRECT_URI || `${baseUrl}/api/auth/callback`
  const scope = 'locations.readonly users.readonly calendars.readonly calendars.write calendars/events.write contacts.readonly contacts.write webhooks.write'

  if (!clientId) {
    return NextResponse.json({ error: 'GHL client id not configured' }, { status: 500 })
  }

  const authUrl = new URL('https://marketplace.gohighlevel.com/oauth/authorize')
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', String(clientId))
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', scope)
  authUrl.searchParams.set('state', accountId)

  return NextResponse.redirect(authUrl.toString())
} 