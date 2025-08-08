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
          // We are not mutating cookies in this handler
          set() {},
          remove() {},
        },
      }
    )

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')

    console.log('🐛 DEBUG - Calendars API called with accountId:', accountId)

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 })
    }

    // First, let's check what connections exist for debugging
    const { data: allConnections, error: allConnectionsError } = await supabase
      .from('ghl_connections')
      .select('*')

    console.log('🐛 DEBUG - All GHL connections visible to requester:', {
      count: allConnections?.length || 0,
      connections: allConnections?.map((c) => ({
        id: c.id,
        account_id: c.account_id,
        is_connected: c.is_connected,
        connection_status: c.connection_status,
      })) || [],
      error: allConnectionsError?.message || null,
    })

    // Get the GHL connection for this account
    const { data: connection, error: connectionError } = await supabase
      .from('ghl_connections')
      .select('*')
      .eq('account_id', accountId)
      .eq('is_connected', true)
      .single()

    console.log('🐛 DEBUG - Connection query result:', {
      accountId,
      connection: connection
        ? {
            id: connection.id,
            account_id: connection.account_id,
            is_connected: connection.is_connected,
            connection_status: connection.connection_status,
            has_access_token: !!connection.access_token,
            has_location_id: !!connection.ghl_location_id,
          }
        : null,
      error: connectionError?.message || null,
    })

    if (connectionError || !connection) {
      return NextResponse.json(
        {
          error: 'No active GHL connection found for this account',
        },
        { status: 404 }
      )
    }

    // Check if token is expired
    if (connection.token_expires_at && new Date(connection.token_expires_at) <= new Date()) {
      return NextResponse.json(
        {
          error: 'GHL token expired. Please reconnect your GoHighLevel account.',
        },
        { status: 401 }
      )
    }

    const baseHeaders: Record<string, string> = {
      Authorization: `Bearer ${connection.access_token}`,
      Version: '2021-07-28',
      Accept: 'application/json',
    }

    const fetchCalendars = async (locationId?: string) => {
      const headers = { ...baseHeaders }
      if (locationId) headers['Location'] = locationId

      const url = new URL('https://services.leadconnectorhq.com/calendars/')
      // Try with header first
      let resp = await fetch(url.toString(), { headers })
      if (!resp.ok && locationId && resp.status === 403) {
        // Try again with query param as fallback for some environments
        const urlWithQuery = new URL('https://services.leadconnectorhq.com/calendars/')
        urlWithQuery.searchParams.set('locationId', locationId)
        resp = await fetch(urlWithQuery.toString(), { headers: baseHeaders })
      }
      return resp
    }

    let locationId = connection.ghl_location_id || ''
    console.log('🐛 DEBUG - Attempting calendars fetch with location:', locationId || '(none)')

    // First attempt using stored location (or none)
    let calendarsResponse = await fetchCalendars(locationId || undefined)

    if (calendarsResponse.ok) {
      const calendarsData = await calendarsResponse.json()
      return NextResponse.json({ success: true, calendars: calendarsData.calendars || [] })
    }

    // If forbidden, try discovering valid locations and retry
    if (calendarsResponse.status === 403) {
      console.warn('Calendars fetch returned 403. Attempting to discover accessible locations...')
      const locationsResp = await fetch('https://services.leadconnectorhq.com/locations', {
        headers: baseHeaders,
      })

      if (locationsResp.ok) {
        const locData = await locationsResp.json()
        const locations: Array<{ id: string; name?: string }> = locData.locations || []
        console.log('🐛 DEBUG - Locations available to token:', locations.map((l) => l.id))

        for (const loc of locations) {
          const tryResp = await fetchCalendars(loc.id)
          if (tryResp.ok) {
            const calendarsData = await tryResp.json()

            // If we used a different location than stored, try to update it for next time
            if (loc.id !== locationId) {
              const { error: updErr } = await supabase
                .from('ghl_connections')
                .update({ ghl_location_id: loc.id })
                .eq('account_id', accountId)
              if (updErr) {
                console.warn('Failed to update ghl_location_id after discovery:', updErr.message)
              } else {
                console.log('Updated ghl_location_id to discovered working location:', loc.id)
              }
            }

            return NextResponse.json({ success: true, calendars: calendarsData.calendars || [] })
          }
        }
      } else {
        const txt = await locationsResp.text()
        console.warn('Failed to list locations for discovery:', locationsResp.status, txt)
      }
    }

    // At this point, propagate the error content
    const errorText = await calendarsResponse.text()
    console.error('GHL Calendars API error (final):', calendarsResponse.status, errorText)
    return NextResponse.json(
      { error: `Failed to fetch calendars: ${calendarsResponse.status}` },
      { status: calendarsResponse.status }
    )
  } catch (error) {
    console.error('Error fetching GHL calendars:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      { status: 500 }
    )
  }
} 