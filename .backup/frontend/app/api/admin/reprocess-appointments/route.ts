import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

// Helper to ensure we have a valid GHL access token for API calls
async function getValidGhlAccessToken(account: any, supabase: any): Promise<string | null> {
  try {
    const authType = account.ghl_auth_type || 'oauth2'
    const currentAccessToken = account.ghl_api_key as string | null
    const refreshToken = account.ghl_refresh_token as string | null
    const expiresAtIso = account.ghl_token_expires_at as string | null

    if (authType !== 'oauth2') return currentAccessToken || null

    const clientId = process.env.GHL_CLIENT_ID
    const clientSecret = process.env.GHL_CLIENT_SECRET
    if (!clientId || !clientSecret) return currentAccessToken || null

    const now = Date.now()
    const expiresAtMs = expiresAtIso ? new Date(expiresAtIso).getTime() : 0
    const skewMs = 2 * 60 * 1000
    const needsRefresh = !currentAccessToken || !expiresAtMs || now >= (expiresAtMs - skewMs)
    if (!needsRefresh) return currentAccessToken as string

    if (!refreshToken) return currentAccessToken || null

    const resp = await fetch('https://services.leadconnectorhq.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    })
    if (!resp.ok) return currentAccessToken || null

    const tokenData = await resp.json()
    const newAccessToken = tokenData.access_token as string
    const newRefreshToken = (tokenData.refresh_token as string) || refreshToken
    const newExpiresAtIso = new Date(Date.now() + (tokenData.expires_in as number) * 1000).toISOString()

    await supabase
      .from('accounts')
      .update({
        ghl_api_key: newAccessToken,
        ghl_refresh_token: newRefreshToken,
        ghl_token_expires_at: newExpiresAtIso,
        ghl_auth_type: 'oauth2',
      })
      .eq('id', account.id)

    return newAccessToken
  } catch (e) {
    return account?.ghl_api_key || null
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json().catch(() => ({}))
    const {
      accountId,
      ghlAppointmentIds,
      since, // ISO string
      limit = 50,
      dryRun = false,
    } = body || {}

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
    }

    // Verify user authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is global admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Only global admins can reprocess appointments' }, { status: 403 })
    }

    // Load account + GHL creds
    const { data: account } = await supabase
      .from('accounts')
      .select('id, name, ghl_location_id, ghl_api_key, ghl_refresh_token, ghl_token_expires_at, ghl_auth_type')
      .eq('id', accountId)
      .single()

    if (!account || !account.ghl_location_id) {
      return NextResponse.json({ error: 'Account not found or not connected to GHL' }, { status: 404 })
    }

    const accessToken = await getValidGhlAccessToken(account, supabase)
    if (!accessToken) {
      return NextResponse.json({ error: 'No valid GHL access token available' }, { status: 400 })
    }

    // Select candidate appointments
    let q = supabase
      .from('appointments')
      .select('id, account_id, contact_id, date_booked, date_booked_for, setter, sales_rep, metadata, ghl_appointment_id')
      .eq('account_id', accountId)
      .order('date_booked', { ascending: false })
      .limit(Math.min(200, Math.max(1, limit)))

    if (since) {
      q = q.gte('date_booked', since)
    }

    if (Array.isArray(ghlAppointmentIds) && ghlAppointmentIds.length > 0) {
      q = q.in('ghl_appointment_id', ghlAppointmentIds)
    }

    const { data: appointments } = await q
    const candidates = (appointments || []).filter((row) => {
      if (!row.ghl_appointment_id) return false
      let m: any = null
      try { m = row.metadata ? JSON.parse(row.metadata as unknown as string) : null } catch {}
      const missingEnrichment = !m?.appointment_api_data || !m?.setter_data || !m?.sales_rep_data
      const placeholderSetter = row.setter === 'Webhook'
      return missingEnrichment || placeholderSetter
    })

    const results: Array<{ id: string, ghlAppointmentId: string, status: 'updated' | 'skipped' | 'failed', reason?: string }> = []

    for (const row of candidates) {
      const ghlId = row.ghl_appointment_id as unknown as string
      try {
        if (dryRun) {
          results.push({ id: row.id as unknown as string, ghlAppointmentId: ghlId, status: 'skipped', reason: 'dryRun' })
          continue
        }

        // Fetch full appointment
        const apptResp = await fetch(`https://services.leadconnectorhq.com/calendars/events/appointments/${ghlId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Version': '2021-07-28',
          },
        })
        if (!apptResp.ok) {
          results.push({ id: row.id as unknown as string, ghlAppointmentId: ghlId, status: 'failed', reason: `appointment fetch ${apptResp.status}` })
          continue
        }
        const apptData = await apptResp.json()
        const fullAppointment = apptData.appointment

        // Fetch contact
        let contactData: any = null
        if (fullAppointment?.contactId) {
          const contactResp = await fetch(`https://services.leadconnectorhq.com/contacts/${fullAppointment.contactId}`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Version': '2021-07-28',
            },
          })
          if (contactResp.ok) {
            const contactApi = await contactResp.json()
            contactData = contactApi.contact
          }
        }

        // Fetch setter and sales rep
        let setterData: any = null
        const setterId = fullAppointment?.createdBy?.userId
        if (setterId) {
          const setterResp = await fetch(`https://services.leadconnectorhq.com/users/${setterId}`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Version': '2021-07-28',
            },
          })
          if (setterResp.ok) setterData = await setterResp.json()
        }

        let salesRepData: any = null
        const salesRepId = fullAppointment?.assignedUserId
        if (salesRepId) {
          const salesResp = await fetch(`https://services.leadconnectorhq.com/users/${salesRepId}`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Version': '2021-07-28',
            },
          })
          if (salesResp.ok) salesRepData = await salesResp.json()
        }

        // Build metadata
        let meta: any = null
        try { meta = row.metadata ? JSON.parse(row.metadata as unknown as string) : {} } catch { meta = {} }
        meta = meta || {}
        meta.appointment_api_data = fullAppointment ? {
          id: fullAppointment.id,
          title: fullAppointment.title,
          appointmentStatus: fullAppointment.appointmentStatus,
          address: fullAppointment.address,
          notes: fullAppointment.notes,
          groupId: fullAppointment.groupId,
          isRecurring: fullAppointment.isRecurring,
          dateAdded: fullAppointment.dateAdded,
          dateUpdated: fullAppointment.dateUpdated,
          endTime: fullAppointment.endTime,
          source: fullAppointment.source,
          createdBy: fullAppointment.createdBy,
        } : null
        meta.contact_enriched_data = contactData ? {
          id: contactData.id,
          firstName: contactData.firstName,
          lastName: contactData.lastName,
          companyName: contactData.companyName,
          timezone: contactData.timezone,
          tags: contactData.tags,
          website: contactData.website,
          address: {
            address1: contactData.address1,
            city: contactData.city,
            state: contactData.state,
            country: contactData.country,
            postalCode: contactData.postalCode,
          },
          attribution: contactData.attributionSource,
          lastActivity: contactData.lastActivity,
          customFields: contactData.customFields,
        } : null
        meta.setter_data = setterData ? {
          id: setterData.id,
          name: setterData.name,
          email: setterData.email,
          firstName: setterData.firstName,
          lastName: setterData.lastName,
        } : null
        meta.sales_rep_data = salesRepData ? {
          id: salesRepData.id,
          name: salesRepData.name,
          email: salesRepData.email,
          firstName: salesRepData.firstName,
          lastName: salesRepData.lastName,
        } : null

        // Names
        const setterName = setterData?.name || `${setterData?.firstName || ''} ${setterData?.lastName || ''}`.trim() || undefined
        const salesRepName = salesRepData?.name || `${salesRepData?.firstName || ''} ${salesRepData?.lastName || ''}`.trim() || undefined

        // Build updates
        const updates: any = {
          metadata: JSON.stringify(meta),
          setter: setterName || row.setter,
          sales_rep: salesRepName || row.sales_rep,
          setter_ghl_id: setterData?.id || null,
          sales_rep_ghl_id: salesRepData?.id || null,
          ghl_source: fullAppointment?.createdBy?.source || fullAppointment?.source || null,
        }

        // Resolve contact_id and include in updates
        try {
          const up = await supabase
            .from('contacts')
            .upsert({
              account_id: row.account_id,
              ghl_contact_id: fullAppointment?.contactId || contactData?.id || null,
              name: (contactData?.firstName || contactData?.lastName) ? `${contactData?.firstName || ''} ${contactData?.lastName || ''}`.trim() : null,
              email: contactData?.email || null,
              phone: contactData?.phone || null,
            }, { onConflict: 'account_id,ghl_contact_id' })
            .select('id')
            .maybeSingle()
          if (up?.data?.id) updates.contact_id = up.data.id
        } catch {}

        await supabase
          .from('appointments')
          .update(updates)
          .eq('id', row.id)

        results.push({ id: row.id as unknown as string, ghlAppointmentId: ghlId, status: 'updated' })
      } catch (e: any) {
        results.push({ id: row.id as unknown as string, ghlAppointmentId: ghlId, status: 'failed', reason: e?.message || 'unknown' })
      }
    }

    return NextResponse.json({
      success: true,
      accountId,
      searched: appointments?.length || 0,
      candidates: candidates.length,
      updated: results.filter(r => r.status === 'updated').length,
      failed: results.filter(r => r.status === 'failed').length,
      results,
    })
  } catch (e) {
    console.error('Reprocess appointments error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 