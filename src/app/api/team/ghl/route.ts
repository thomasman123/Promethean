import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient<Database>(
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

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 })

    // Verify user authentication and permissions
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is global admin or account moderator
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isGlobalAdmin = profile?.role === 'admin'
    
    if (!isGlobalAdmin) {
      // Check for account-level access
      const { data: access } = await supabase
        .from('account_access')
        .select('role')
        .eq('user_id', user.id)
        .eq('account_id', accountId)
        .eq('is_active', true)
        .single()

      if (!access || !['moderator'].includes(access.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }

    // Get account with OAuth connection
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .eq('ghl_auth_type', 'oauth2')
      .single()

    if (accountError || !account) {
      return NextResponse.json({ error: 'No active GHL OAuth connection for this account' }, { status: 404 })
    }

    if (account.ghl_token_expires_at && new Date(account.ghl_token_expires_at) <= new Date()) {
      return NextResponse.json({ error: 'GHL token expired' }, { status: 401 })
    }

    if (!account.ghl_api_key) {
      return NextResponse.json({ error: 'No GHL access token found' }, { status: 401 })
    }

    const baseHeaders: Record<string, string> = {
      Authorization: `Bearer ${account.ghl_api_key}`,
      Version: '2021-07-28',
      Accept: 'application/json',
    }

    const fetchUsersViaLocationPath = async (locationId: string) => {
      const url = `https://services.leadconnectorhq.com/locations/${encodeURIComponent(locationId)}/users/`
      const resp = await fetch(url, { headers: baseHeaders })
      return resp
    }

    const fetchUsers = async (locationId?: string) => {
      const headers = { ...baseHeaders }
      if (locationId) headers['Location'] = locationId

      // Try location path first when we have a location id
      if (locationId) {
        const pathResp = await fetchUsersViaLocationPath(locationId)
        if (pathResp.ok) return pathResp
      }

      // Try generic users endpoint with header
      let resp = await fetch('https://services.leadconnectorhq.com/users/', { headers })
      if (!resp.ok && locationId && (resp.status === 403 || resp.status === 422)) {
        const urlWithQuery = new URL('https://services.leadconnectorhq.com/users/')
        urlWithQuery.searchParams.set('locationId', locationId)
        resp = await fetch(urlWithQuery.toString(), { headers: baseHeaders })
      }
      return resp
    }

    let locationId = account.ghl_location_id || ''
    let usersResp = await fetchUsers(locationId || undefined)

    if (!usersResp.ok && (usersResp.status === 403 || usersResp.status === 422)) {
      // Discover locations and retry
      const locResp = await fetch('https://services.leadconnectorhq.com/locations', { headers: baseHeaders })
      if (locResp.ok) {
        const locData = await locResp.json()
        const locations: Array<{ id: string; name?: string }> = locData.locations || []
        for (const loc of locations) {
          const tryResp = await fetchUsers(loc.id)
          if (tryResp.ok) {
            // Update stored location for next time
            if (loc.id !== locationId) {
              await supabase.from('accounts').update({ ghl_location_id: loc.id }).eq('id', accountId)
            }
            usersResp = tryResp
            break
          }
        }
      } else {
        const t = await locResp.text().catch(() => '')
        console.warn('GHL locations fallback failed:', locResp.status, t)
      }
    }

    if (!usersResp.ok) {
      const text = await usersResp.text().catch(() => '')
      console.error('GHL Users API error:', usersResp.status, text)
      return NextResponse.json({ error: `Failed to fetch GHL users: ${usersResp.status}` }, { status: usersResp.status })
    }

    const usersData: { users?: any[]; data?: any[] } = await usersResp.json()
    const baseUsers = (usersData.users || usersData.data || []).map((u: { id?: string; email?: string; userEmail?: string; name?: string; firstName?: string; lastName?: string; role?: string; userType?: string; }) => ({
      id: (u.id || '') as string,
      email: u.email || u.userEmail || null,
      name: u.name || [u.firstName, u.lastName].filter(Boolean).join(' ') || null,
      role: u.role || u.userType || null,
    }))

    // Enrich with invited/joined state
    const emails = baseUsers.map(u => u.email).filter(Boolean) as string[]

    const { data: invitedRows } = await supabase
      .from('invitations')
      .select('email, status')
      .eq('account_id', accountId)

    const invitedSet = new Set((invitedRows || []).filter(r => r.status !== 'accepted').map(r => (r.email || '').toLowerCase()))

    const { data: accessRows } = await supabase
      .from('account_access')
      .select('user_id')
      .eq('account_id', accountId)
      .eq('is_active', true)

    const userIds = (accessRows || []).map(r => r.user_id)
    let joinedEmails = new Set<string>()
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id,email')
        .in('id', userIds)
      joinedEmails = new Set((profiles || []).map(p => (p.email || '').toLowerCase()))
    }

    const users = baseUsers.map((u: { id: string; email: string | null; name: string | null; role: string | null; }) => ({
      ...u,
      invited: u.email ? invitedSet.has(u.email.toLowerCase()) : false,
      joined: u.email ? joinedEmails.has(u.email.toLowerCase()) : false,
    }))

    return NextResponse.json({ users })
  } catch (e) {
    console.error('Team GHL API error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 