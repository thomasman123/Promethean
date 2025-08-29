import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface GHLContact {
  id: string
  firstName?: string
  lastName?: string
  name?: string
  email?: string
  phone?: string
  dateAdded?: string
  dateUpdated?: string
  tags?: string[]
  source?: string
  customFields?: Record<string, any>
}

async function getValidGhlAccessToken(account: any): Promise<string | null> {
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

function mapGhlContactToDatabase(ghlContact: any, accountId: string) {
  return {
    account_id: accountId,
    ghl_contact_id: ghlContact.id,
    first_name: ghlContact.firstName || null,
    last_name: ghlContact.lastName || null,
    name: ghlContact.name || [ghlContact.firstName, ghlContact.lastName].filter(Boolean).join(' ') || null,
    email: ghlContact.email || null,
    phone: ghlContact.phone || null,
    source: ghlContact.source || null,
    date_added: ghlContact.dateAdded ? new Date(ghlContact.dateAdded).toISOString() : null,
    date_updated: ghlContact.dateUpdated ? new Date(ghlContact.dateUpdated).toISOString() : null,
    tags: ghlContact.tags || [],
    custom_fields: ghlContact.customFields || {},
  }
}

/**
 * Sync a single contact from GHL by contact ID
 * This is the future-proof method that uses the same proven API process as the Sync Contacts button
 */
export async function syncSingleContactFromGHL(accountId: string, ghlContactId: string): Promise<{ success: boolean; contactId?: string; error?: string }> {
  try {
    console.log(`🔄 Syncing contact ${ghlContactId} for account ${accountId}...`)

    // Load account with GHL credentials
    const { data: account } = await supabase
      .from('accounts')
      .select('id, name, ghl_location_id, ghl_api_key, ghl_refresh_token, ghl_token_expires_at, ghl_auth_type')
      .eq('id', accountId)
      .single()

    if (!account) {
      return { success: false, error: 'Account not found or not connected to GHL' }
    }

    const accessToken = await getValidGhlAccessToken(account)
    if (!accessToken) {
      return { success: false, error: 'No valid GHL access token available' }
    }

    const baseHeaders: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      Version: '2021-07-28',
      Accept: 'application/json',
    }

    const locationId = account.ghl_location_id

    // Try multiple strategies to fetch the contact
    const fetchStrategies = [
      // Strategy 1: Location path with contact ID
      locationId ? `https://services.leadconnectorhq.com/locations/${encodeURIComponent(locationId)}/contacts/${encodeURIComponent(ghlContactId)}` : null,
      // Strategy 2: Generic endpoint with Location header
      `https://services.leadconnectorhq.com/contacts/${encodeURIComponent(ghlContactId)}`,
    ].filter(Boolean) as string[]

    let contactData: any = null
    let usedLocationId = locationId

    for (const url of fetchStrategies) {
      const headers = { ...baseHeaders }
      if (usedLocationId && url.includes('/locations/')) {
        // Location is already in the URL path
      } else if (usedLocationId) {
        headers['Location'] = usedLocationId
      }

      console.log(`📡 Trying to fetch contact from: ${url}`)
      const resp = await fetch(url, { headers })

      if (resp.ok) {
        const data = await resp.json()
        contactData = data.contact || data
        console.log(`✅ Successfully fetched contact from GHL`)
        break
      } else if (resp.status === 404) {
        console.log(`⚠️ Contact ${ghlContactId} not found in GHL`)
        return { success: false, error: 'Contact not found in GHL' }
      } else if (resp.status === 403 || resp.status === 422) {
        // Try discovering a valid location if we haven't already
        if (!usedLocationId || usedLocationId === locationId) {
          console.log(`🔍 Trying to discover valid location...`)
          try {
            const locResp = await fetch('https://services.leadconnectorhq.com/locations/', {
              headers: baseHeaders
            })
            if (locResp.ok) {
              const locData = await locResp.json()
              const locations = locData.locations || []
              if (locations.length > 0) {
                usedLocationId = locations[0].id
                console.log(`🎯 Discovered location: ${usedLocationId}`)
                // Update account with discovered location
                if (usedLocationId !== locationId) {
                  await supabase.from('accounts').update({ ghl_location_id: usedLocationId }).eq('id', accountId)
                }
                continue // Retry with new location
              }
            }
          } catch (e) {
            console.error('Location discovery failed:', e)
          }
        }
        console.log(`❌ Failed to fetch contact: ${resp.status} ${resp.statusText}`)
      }
    }

    if (!contactData) {
      return { success: false, error: 'Failed to fetch contact from GHL after trying all strategies' }
    }

    // Map and upsert the contact
    const mappedContact = mapGhlContactToDatabase(contactData, accountId)
    
    console.log(`💾 Upserting contact to database...`)
    const { data: upsertedContact, error: upsertError } = await supabase
      .from('contacts')
      .upsert(mappedContact, { onConflict: 'account_id,ghl_contact_id' })
      .select('id')
      .single()

    if (upsertError) {
      console.error('❌ Contact upsert failed:', upsertError)
      return { success: false, error: `Database upsert failed: ${upsertError.message}` }
    }

    console.log(`✅ Contact synced successfully: ${upsertedContact.id}`)
    return { success: true, contactId: upsertedContact.id }

  } catch (error: any) {
    console.error('❌ syncSingleContactFromGHL error:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
} 