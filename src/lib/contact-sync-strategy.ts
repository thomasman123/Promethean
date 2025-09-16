import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

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
    const contactData = mapGHLContactToSupabase(payload, accountId)
    
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
    const mappedContact = mapGHLContactToSupabase(contactData, accountId)
    
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
 * Map GHL contact data to Supabase format
 */
function mapGHLContactToSupabase(ghlContact: GHLContactData, accountId: string) {
  const firstName = ghlContact.firstName || null
  const lastName = ghlContact.lastName || null
  const name = ghlContact.name || [firstName, lastName].filter(Boolean).join(' ') || null

  return {
    account_id: accountId,
    ghl_contact_id: ghlContact.id,
    first_name: firstName,
    last_name: lastName,
    name,
    email: ghlContact.email || null,
    phone: ghlContact.phone || null,
    source: ghlContact.source || null,
    assigned_to: ghlContact.assignedTo || null,
    date_added: ghlContact.dateAdded ? new Date(ghlContact.dateAdded).toISOString() : new Date().toISOString(),
    date_updated: ghlContact.dateUpdated ? new Date(ghlContact.dateUpdated).toISOString() : new Date().toISOString(),
    ghl_created_at: ghlContact.dateAdded ? new Date(ghlContact.dateAdded).toISOString() : new Date().toISOString(),
    tags: Array.isArray(ghlContact.tags) ? ghlContact.tags : [],
    // Additional fields can be added here as needed
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
  
  let syncedCount = 0
  let hasMore = true
  let searchAfter: any[] = []
  const limit = 100

  while (hasMore) {
    try {
      // Use GHL Search Contacts API with proper pagination
      const requestBody: any = {
        locationId: locationId,
        limit: limit
      }
      
      // Add searchAfter for pagination (skip on first request)
      if (searchAfter.length > 0) {
        requestBody.searchAfter = searchAfter
      }

      console.log(`📞 Fetching contacts from GHL API - batch with limit ${limit}`, searchAfter.length > 0 ? `(searchAfter: ${searchAfter})` : '(first batch)')

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
            const contactData = mapGHLContactToSupabase(ghlContact, accountId)
            
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
            const contactData = mapGHLContactToSupabase(ghlContact, accountId)
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
      } else {
        hasMore = false
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