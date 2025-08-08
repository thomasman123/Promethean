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

    // Get connection
    const { data: connection, error: connectionError } = await supabase
      .from('ghl_connections')
      .select('*')
      .eq('account_id', accountId)
      .eq('is_connected', true)
      .single()

    if (connectionError || !connection) {
      return NextResponse.json({ error: 'No active GHL connection for this account' }, { status: 404 })
    }

    if (connection.token_expires_at && new Date(connection.token_expires_at) <= new Date()) {
      return NextResponse.json({ error: 'GHL token expired' }, { status: 401 })
    }

    const baseHeaders: Record<string, string> = {
      Authorization: `Bearer ${connection.access_token}`,
      Version: '2021-07-28',
      Accept: 'application/json',
    }

    const fetchUsers = async (locationId?: string) => {
      const headers = { ...baseHeaders }
      if (locationId) headers['Location'] = locationId

      // Try users endpoint; fallback with query param
      let resp = await fetch('https://services.leadconnectorhq.com/users/', { headers })
      if (!resp.ok && locationId && resp.status === 403) {
        const urlWithQuery = new URL('https://services.leadconnectorhq.com/users/')
        urlWithQuery.searchParams.set('locationId', locationId)
        resp = await fetch(urlWithQuery.toString(), { headers: baseHeaders })
      }
      return resp
    }

    let locationId = connection.ghl_location_id || ''
    let usersResp = await fetchUsers(locationId || undefined)

    if (!usersResp.ok && usersResp.status === 403) {
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
              await supabase.from('ghl_connections').update({ ghl_location_id: loc.id }).eq('account_id', accountId)
            }
            usersResp = tryResp
            break
          }
        }
      }
    }

    if (!usersResp.ok) {
      const text = await usersResp.text()
      return NextResponse.json({ error: `Failed to fetch GHL users: ${usersResp.status}`, details: text }, { status: usersResp.status })
    }

    const usersData = await usersResp.json()
    const users = (usersData.users || usersData.data || []).map((u: any) => ({
      id: u.id,
      email: u.email || u.userEmail || null,
      name: u.name || [u.firstName, u.lastName].filter(Boolean).join(' ') || null,
      role: u.role || u.userType || null,
    }))

    return NextResponse.json({ users })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 