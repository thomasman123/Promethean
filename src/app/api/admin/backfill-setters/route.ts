import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

/**
 * Admin endpoint to backfill setter information from GHL API
 * Fetches appointments with "Unknown" setter and looks up the actual setter via GHL API
 */
export async function POST(request: NextRequest) {
  console.log('🔄 [admin-backfill-setters] Starting setter backfill from GHL API')

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

  try {
    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      console.log('❌ Admin access denied for user:', user.id)
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    console.log('✅ Admin access verified')

    // Use service role to query and update data
    const serviceSupabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get() { return undefined },
          set() {},
          remove() {},
        },
      }
    )

    // Get all appointments with "Unknown" setter
    const { data: unknownSetterAppts, error: fetchError } = await serviceSupabase
      .from('appointments')
      .select(`
        id,
        ghl_appointment_id,
        setter,
        setter_user_id,
        account_id,
        accounts!inner (
          id,
          name,
          ghl_api_key,
          ghl_location_id,
          ghl_refresh_token,
          ghl_token_expires_at,
          ghl_auth_type
        )
      `)
      .eq('setter', 'Unknown')
      .is('setter_user_id', null)
      .not('ghl_appointment_id', 'is', null)

    if (fetchError) {
      console.error('❌ Error fetching appointments:', fetchError)
      return NextResponse.json({ 
        error: 'Failed to fetch appointments', 
        details: fetchError.message 
      }, { status: 500 })
    }

    console.log(`📊 Found ${unknownSetterAppts?.length || 0} appointments with Unknown setter`)

    if (!unknownSetterAppts || unknownSetterAppts.length === 0) {
      return NextResponse.json({ 
        success: true,
        message: 'No appointments to backfill',
        stats: { processed: 0, updated: 0, failed: 0 }
      })
    }

    let processed = 0
    let updated = 0
    let failed = 0
    const errors: any[] = []

    // Helper to get valid access token
    async function getValidAccessToken(account: any): Promise<string | null> {
      try {
        const authType = account.ghl_auth_type || 'oauth2'
        const currentToken = account.ghl_api_key
        const refreshToken = account.ghl_refresh_token
        const expiresAt = account.ghl_token_expires_at

        if (authType !== 'oauth2') {
          return currentToken
        }

        const now = Date.now()
        const expiresAtMs = expiresAt ? new Date(expiresAt).getTime() : 0
        const needsRefresh = !currentToken || !expiresAtMs || now >= (expiresAtMs - 2 * 60 * 1000)

        if (!needsRefresh) {
          return currentToken
        }

        if (!refreshToken) {
          console.warn('⚠️ No refresh token, using stored token')
          return currentToken
        }

        const clientId = process.env.GHL_CLIENT_ID
        const clientSecret = process.env.GHL_CLIENT_SECRET

        if (!clientId || !clientSecret) {
          console.warn('⚠️ Missing OAuth credentials')
          return currentToken
        }

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

        if (!resp.ok) {
          console.error('❌ Token refresh failed')
          return currentToken
        }

        const tokenData = await resp.json()
        const newToken = tokenData.access_token
        const newRefresh = tokenData.refresh_token || refreshToken
        const newExpiry = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()

        // Update stored token
        await serviceSupabase
          .from('accounts')
          .update({
            ghl_api_key: newToken,
            ghl_refresh_token: newRefresh,
            ghl_token_expires_at: newExpiry,
          })
          .eq('id', account.id)

        return newToken
      } catch (e) {
        console.error('⚠️ Token helper error:', e)
        return account.ghl_api_key
      }
    }

    // Process each appointment
    for (const appt of unknownSetterAppts) {
      processed++
      const account = (appt as any).accounts

      try {
        console.log(`📍 Processing appointment ${appt.id} (${processed}/${unknownSetterAppts.length})`)

        // Get valid access token
        const accessToken = await getValidAccessToken(account)
        if (!accessToken) {
          console.error(`❌ No access token for account ${account.name}`)
          failed++
          errors.push({ appointmentId: appt.id, error: 'No access token' })
          continue
        }

        // Fetch appointment from GHL API
        const ghlResponse = await fetch(
          `https://services.leadconnectorhq.com/calendars/events/appointments/${appt.ghl_appointment_id}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Version': '2021-07-28',
            },
          }
        )

        if (!ghlResponse.ok) {
          console.error(`❌ GHL API error for appointment ${appt.ghl_appointment_id}: ${ghlResponse.status}`)
          failed++
          errors.push({ 
            appointmentId: appt.id, 
            error: `GHL API returned ${ghlResponse.status}` 
          })
          continue
        }

        const ghlData = await ghlResponse.json()
        // GHL API returns data under 'appointment' key
        const event = ghlData.appointment || ghlData.event || ghlData

        // Get the setter (createdBy.userId)
        const setterGhlId = event.createdBy?.userId
        
        if (!setterGhlId) {
          console.log(`⚠️ No createdBy.userId for appointment ${appt.id}`)
          failed++
          errors.push({ appointmentId: appt.id, error: 'No createdBy.userId in GHL data' })
          continue
        }

        console.log(`🔍 Found setter GHL ID: ${setterGhlId}`)

        // Fetch setter user details from GHL
        const userResponse = await fetch(
          `https://services.leadconnectorhq.com/users/${setterGhlId}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Version': '2021-07-28',
            },
          }
        )

        if (!userResponse.ok) {
          console.error(`❌ Failed to fetch user ${setterGhlId}`)
          failed++
          errors.push({ appointmentId: appt.id, error: 'Failed to fetch user from GHL' })
          continue
        }

        const userData = await userResponse.json()
        const setterName = userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim()
        const setterEmail = userData.email

        console.log(`✅ Found setter: ${setterName} (${setterEmail})`)

        // Try to link to existing platform user
        const { linkExistingUsersToData } = await import('@/lib/auto-user-creation')
        const userIds = await linkExistingUsersToData(
          serviceSupabase,
          account.id,
          setterName,
          null,
          setterEmail,
          null
        )

        // Update appointment with setter info
        const updateData: any = {
          setter: setterName,
          updated_at: new Date().toISOString(),
        }

        if (userIds.setterUserId) {
          updateData.setter_user_id = userIds.setterUserId
          console.log(`✅ Linked setter to user: ${userIds.setterUserId}`)
        } else {
          console.log(`⚠️ Setter ${setterName} not found in platform users`)
        }

        const { error: updateError } = await serviceSupabase
          .from('appointments')
          .update(updateData)
          .eq('id', appt.id)

        if (updateError) {
          console.error(`❌ Failed to update appointment ${appt.id}:`, updateError)
          failed++
          errors.push({ appointmentId: appt.id, error: updateError.message })
        } else {
          updated++
          console.log(`✅ Updated appointment ${appt.id} with setter ${setterName}`)
        }

      } catch (error: any) {
        console.error(`❌ Error processing appointment ${appt.id}:`, error)
        failed++
        errors.push({ 
          appointmentId: appt.id, 
          error: error.message || 'Unknown error' 
        })
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log(`✅ Backfill complete: ${updated} updated, ${failed} failed out of ${processed} processed`)

    return NextResponse.json({ 
      success: true,
      message: 'Setter backfill completed',
      stats: {
        processed,
        updated,
        failed,
      },
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined // Return first 10 errors
    })

  } catch (error: any) {
    console.error('❌ Unexpected error:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 })
  }
}

