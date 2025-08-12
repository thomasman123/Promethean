import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Helper function to auto-create users for data linking
export async function ensureUsersExistForData(
  supabase: ReturnType<typeof createClient<Database>>,
  accountId: string,
  setterName: string | null,
  salesRepName: string | null,
  ghlApiKey?: string,
  ghlLocationId?: string
): Promise<{ setterUserId?: string; salesRepUserId?: string }> {
  const result: { setterUserId?: string; salesRepUserId?: string } = {}
  
  try {
    // Process setter
    if (setterName && setterName.trim()) {
      const setterEmail = await getGHLEmailForUser(setterName, ghlApiKey, ghlLocationId)
      const { data: setterUserId } = await supabase.rpc(
        'create_data_user_if_not_exists',
        {
          p_account_id: accountId,
          p_name: setterName.trim(),
          p_role: 'setter',
          p_email: setterEmail || undefined
        }
      )
      if (setterUserId) result.setterUserId = setterUserId
    }

    // Process sales rep
    if (salesRepName && salesRepName.trim()) {
      const salesRepEmail = await getGHLEmailForUser(salesRepName, ghlApiKey, ghlLocationId)
      const { data: salesRepUserId } = await supabase.rpc(
        'create_data_user_if_not_exists',
        {
          p_account_id: accountId,
          p_name: salesRepName.trim(),
          p_role: 'sales_rep',
          p_email: salesRepEmail || undefined
        }
      )
      if (salesRepUserId) result.salesRepUserId = salesRepUserId
    }

    return result
  } catch (error) {
    console.error('Error ensuring users exist for data:', error)
    return result
  }
}

// Helper function to get email from GHL API (if available)
async function getGHLEmailForUser(
  userName: string,
  ghlApiKey?: string,
  ghlLocationId?: string
): Promise<string | null> {
  if (!ghlApiKey) return null
  
  try {
    console.log(`🔍 Looking up GHL email for user: ${userName}`)
    
    const headers = {
      'Authorization': `Bearer ${ghlApiKey}`,
      'Version': '2021-07-28',
      'Accept': 'application/json',
    }
    
    // Try different endpoints to find the user
    const endpoints = [
      `https://services.leadconnectorhq.com/locations/${ghlLocationId}/users/`,
      'https://services.leadconnectorhq.com/users/'
    ]
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, { headers })
        if (response.ok) {
          const data = await response.json()
          const users = data.users || data.data || []
          
          // Search for user by name (fuzzy matching)
          const user = users.find((u: any) => {
            const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ')
            const displayName = u.name || fullName
            return displayName?.toLowerCase().includes(userName.toLowerCase()) ||
                   userName.toLowerCase().includes(displayName?.toLowerCase())
          })
          
          if (user && (user.email || user.userEmail)) {
            const email = user.email || user.userEmail
            console.log(`✅ Found GHL email for ${userName}: ${email}`)
            return email
          }
        }
      } catch (endpointError) {
        console.warn(`Failed to fetch from ${endpoint}:`, endpointError)
        continue
      }
    }
    
    console.warn(`⚠️  No GHL email found for user: ${userName}`)
    return null
  } catch (error) {
    console.error('Error fetching GHL email for user:', userName, error)
    return null
  }
} 