import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { formatInTimeZone, utcToZonedTime } from 'date-fns-tz'
import { startOfWeek, startOfMonth } from 'date-fns'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface GHLContactData {
  id: string
  firstName?: string
  lastName?: string
  name?: string
  email?: string
  phone?: string
  dateAdded?: string
  dateUpdated?: string
  source?: string
  tags?: string[]
  assignedTo?: string
  customFields?: any[]
  address1?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
  companyName?: string
  website?: string
  dnd?: boolean
  timezone?: string
  [key: string]: any
}

/**
 * Comprehensive contact sync strategy:
 * 1. ContactCreate webhook: Always upsert contact immediately
 * 2. Appointment/Dial/Discovery: Check if contact exists, fetch from GHL API if not
 * 3. Always keep contacts up to date with latest GHL data
 */

/**
 * Process ContactCreate webhook - always upsert contact
 */
export async function processContactCreateWebhook(payload: any, accountId: string): Promise<string | null> {
  console.log('👤 Processing ContactCreate webhook for contact:', payload.id)
  
  try {
    // Get account timezone for local date calculations
    const { data: account } = await supabase
      .from('accounts')
      .select('business_timezone')
      .eq('id', accountId)
      .single()
    
    const accountTimezone = account?.business_timezone || 'UTC'
    
    const contactData = mapGHLContactToSupabase(payload, accountId, accountTimezone)
    
    const { data: contact, error } = await supabase
      .from('contacts')
      .upsert(contactData, { 
        onConflict: 'account_id,ghl_contact_id',
        ignoreDuplicates: false // Always update with latest data
      })
      .select('id')
      .single()

    if (error) {
      console.error('❌ Failed to upsert contact from webhook:', error)
      return null
    }

    console.log('✅ Contact upserted from webhook:', contact.id)
    return contact.id
    
  } catch (error) {
    console.error('❌ Error processing ContactCreate webhook:', error)
    return null
  }
}

/**
 * Ensure contact exists for appointment/dial/discovery
 * If not found, fetch from GHL API and create
 */
export async function ensureContactExists(
  ghlContactId: string, 
  accountId: string, 
  accessToken: string
): Promise<string | null> {
  
  if (!ghlContactId) return null
  
  // First check if contact already exists
  const { data: existingContact } = await supabase
    .from('contacts')
    .select('id')
    .eq('account_id', accountId)
    .eq('ghl_contact_id', ghlContactId)
    .single()

  if (existingContact) {
    console.log('✅ Contact already exists:', existingContact.id)
    return existingContact.id
  }

  // Contact doesn't exist, fetch from GHL API
  console.log('🔄 Contact not found, fetching from GHL API:', ghlContactId)
  
  try {
    // Get account timezone for local date calculations
    const { data: account } = await supabase
      .from('accounts')
      .select('business_timezone')
      .eq('id', accountId)
      .single()
    
    const accountTimezone = account?.business_timezone || 'UTC'
    
    const response = await fetch(`https://services.leadconnectorhq.com/contacts/${ghlContactId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Version': '2021-07-28',
      },
    })

    if (!response.ok) {
      console.error('❌ Failed to fetch contact from GHL API:', response.status)
      return null
    }

    const json = await response.json()
    const contactData = json.contact || json
    
    if (!contactData) {
      console.error('❌ No contact data in GHL API response')
      return null
    }

    // Create contact from GHL API data
    const mappedContact = mapGHLContactToSupabase(contactData, accountId, accountTimezone)
    
    const { data: newContact, error } = await supabase
      .from('contacts')
      .upsert(mappedContact, { 
        onConflict: 'account_id,ghl_contact_id',
        ignoreDuplicates: false
      })
      .select('id')
      .single()

    if (error) {
      console.error('❌ Failed to create contact from GHL API:', error)
      return null
    }

    console.log('✅ Contact created from GHL API:', newContact.id)
    return newContact.id
    
  } catch (error) {
    console.error('❌ Error fetching contact from GHL API:', error)
    return null
  }
}

/**
 * Map GHL contact data to Supabase format with timezone-aware local dates
 */
function mapGHLContactToSupabase(ghlContact: GHLContactData, accountId: string, accountTimezone: string = 'UTC') {
  const firstName = ghlContact.firstName || null
  const lastName = ghlContact.lastName || null
  const name = ghlContact.name || [firstName, lastName].filter(Boolean).join(' ') || null
  
  // Use contact's timezone if available, otherwise use account timezone
  const timezone = ghlContact.timezone || accountTimezone
  
  // Calculate local dates based on when contact was created in GHL
  const createdAtDate = ghlContact.dateAdded ? new Date(ghlContact.dateAdded) : new Date()
  const ghlCreatedAt = createdAtDate.toISOString()
  
  // Convert UTC timestamp to local timezone for date calculations
  const localDate = utcToZonedTime(createdAtDate, timezone)
  
  // Calculate local date fields (YYYY-MM-DD format)
  const ghlLocalDate = formatInTimeZone(localDate, timezone, 'yyyy-MM-dd')
  
  // Calculate start of week (Monday) in local timezone
  const weekStart = startOfWeek(localDate, { weekStartsOn: 1 }) // Monday = 1
  const ghlLocalWeek = formatInTimeZone(weekStart, timezone, 'yyyy-MM-dd')
  
  // Calculate start of month in local timezone
  const monthStart = startOfMonth(localDate)
  const ghlLocalMonth = formatInTimeZone(monthStart, timezone, 'yyyy-MM-dd')

  return {
    account_id: accountId,
    ghl_contact_id: ghlContact.id,
    first_name: firstName,
    last_name: lastName,
    name,
    email: ghlContact.email || null,
    phone: ghlContact.phone || null,
    source: ghlContact.source || null,
    timezone: timezone,
    assigned_to: ghlContact.assignedTo || null,
    date_added: ghlContact.dateAdded ? new Date(ghlContact.dateAdded).toISOString() : new Date().toISOString(),
    date_updated: ghlContact.dateUpdated ? new Date(ghlContact.dateUpdated).toISOString() : new Date().toISOString(),
    ghl_created_at: ghlCreatedAt,
    ghl_local_date: ghlLocalDate,
    ghl_local_week: ghlLocalWeek,
    ghl_local_month: ghlLocalMonth,
    tags: Array.isArray(ghlContact.tags) ? ghlContact.tags : [],
    custom_fields: ghlContact.customFields || null,
    // Address fields
    address: ghlContact.address1 || null,
    city: ghlContact.city || null,
    state: ghlContact.state || null,
    country: ghlContact.country || null,
    postal_code: ghlContact.postalCode || null,
    // Additional fields
    company: ghlContact.companyName || null,
    website: ghlContact.website || null,
    do_not_contact: ghlContact.dnd || false,
  }
}

/**
 * Backfill existing contacts with GHL creation dates
 */
export async function backfillContactGHLDates(accountId: string, accessToken: string): Promise<number> {
  console.log('🔄 Starting contact GHL dates backfill for account:', accountId)
  
  let processedCount = 0
  let hasMore = true
  let offset = 0
  const limit = 100

  while (hasMore) {
    // Get contacts without ghl_created_at
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('id, ghl_contact_id')
      .eq('account_id', accountId)
      .is('ghl_created_at', null)
      .not('ghl_contact_id', 'is', null)
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('❌ Error fetching contacts for backfill:', error)
      break
    }

    if (!contacts || contacts.length === 0) {
      hasMore = false
      break
    }

    // Process each contact
    for (const contact of contacts) {
      try {
        const response = await fetch(`https://services.leadconnectorhq.com/contacts/${contact.ghl_contact_id}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Version': '2021-07-28',
          },
        })

        if (response.ok) {
          const json = await response.json()
          const ghlContact = json.contact || json
          
          if (ghlContact.dateAdded) {
            await supabase
              .from('contacts')
              .update({ 
                ghl_created_at: new Date(ghlContact.dateAdded).toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', contact.id)
            
            processedCount++
          }
        }
        
        // Rate limiting - wait 100ms between API calls
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        console.error('❌ Error processing contact in backfill:', contact.id, error)
      }
    }

    offset += limit
    console.log(`🔄 Processed ${processedCount} contacts so far...`)
  }

  console.log(`✅ Backfill complete. Processed ${processedCount} contacts`)
  return processedCount
}

/**
 * Sync ALL contacts from GHL API - gets every contact that exists in GHL but not in our app
 */
export async function syncAllContactsFromGHL(accountId: string, accessToken: string, locationId: string): Promise<number> {
  console.log('🔄 Starting full contact sync from GHL for account:', accountId)
  
  // Get account timezone for local date calculations
  const { data: account } = await supabase
    .from('accounts')
    .select('business_timezone')
    .eq('id', accountId)
    .single()
  
  const accountTimezone = account?.business_timezone || 'UTC'
  
  let syncedCount = 0
  let hasMore = true
  let searchAfter: any[] = []
  const limit = 100

  while (hasMore) {
    try {
      // Use GHL Search Contacts API with proper pagination
      const requestBody: any = {
        locationId: locationId,
        pageLimit: limit // GHL API uses pageLimit, not limit
      }
      
      // Add searchAfter for pagination (skip on first request)
      if (searchAfter.length > 0) {
        requestBody.searchAfter = searchAfter
      }

      console.log(`📞 Fetching contacts from GHL API - batch with pageLimit ${limit}`, searchAfter.length > 0 ? `(searchAfter: ${searchAfter})` : '(first batch)')

      const response = await fetch('https://services.leadconnectorhq.com/contacts/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Failed to fetch contacts from GHL Search API:', response.status, errorText)
        break
      }

      const json = await response.json()
      const contacts = json.contacts || []
      const total = json.total || 0
      
      console.log(`📞 Received ${contacts.length} contacts from GHL (total available: ${total})`)

      if (!contacts || contacts.length === 0) {
        hasMore = false
        break
      }

      // Process each contact from GHL
      for (const ghlContact of contacts) {
        try {
          // Check if contact already exists
          const { data: existingContact } = await supabase
            .from('contacts')
            .select('id')
            .eq('account_id', accountId)
            .eq('ghl_contact_id', ghlContact.id)
            .single()

          if (!existingContact) {
            // Contact doesn't exist, create it
            const contactData = mapGHLContactToSupabase(ghlContact, accountId, accountTimezone)
            
            const { data: newContact, error } = await supabase
              .from('contacts')
              .insert(contactData)
              .select('id')
              .single()

            if (error) {
              console.error('❌ Failed to create contact:', ghlContact.id, error)
            } else {
              console.log('✅ Created new contact from GHL:', newContact.id)
              syncedCount++
            }
          } else {
            // Contact exists, update it with latest GHL data
            const contactData = mapGHLContactToSupabase(ghlContact, accountId, accountTimezone)
            delete (contactData as any).account_id // Don't update account_id
            delete (contactData as any).ghl_contact_id // Don't update ghl_contact_id
            
            const { error } = await supabase
              .from('contacts')
              .update({
                ...contactData,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingContact.id)

            if (error) {
              console.error('❌ Failed to update contact:', ghlContact.id, error)
            } else {
              console.log('✅ Updated existing contact from GHL:', existingContact.id)
              syncedCount++
            }
          }
          
        } catch (error) {
          console.error('❌ Error processing contact from GHL:', ghlContact.id, error)
        }
      }

      // Set up pagination for next request
      if (contacts.length === limit) {
        // More contacts available, use searchAfter from last contact
        const lastContact = contacts[contacts.length - 1]
        if (lastContact.searchAfter) {
          searchAfter = lastContact.searchAfter
        } else {
          // Fallback pagination using timestamp and ID
          searchAfter = [new Date(lastContact.dateAdded || lastContact.dateUpdated || new Date()).getTime(), lastContact.id]
        }
        console.log(`📞 Next batch will use searchAfter:`, searchAfter)
      } else {
        hasMore = false
        console.log(`📞 Last batch - received ${contacts.length} contacts (less than pageLimit ${limit})`)
      }
      
      // Rate limiting between batches
      await new Promise(resolve => setTimeout(resolve, 500))
      
      console.log(`🔄 Synced ${syncedCount} contacts so far... (${contacts.length < limit ? 'Last batch' : 'More available'})`)
      
    } catch (error) {
      console.error('❌ Error fetching contacts batch from GHL:', error)
      break
    }
  }

  console.log(`✅ Full contact sync complete. Synced ${syncedCount} contacts`)
  return syncedCount
} 