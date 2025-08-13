import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Helper function to ensure GHL users exist in centralized table and link existing app users
export async function ensureUsersExistForData(
  supabase: ReturnType<typeof createClient<Database>>,
  accountId: string,
  setterName: string | null,
  salesRepName: string | null,
  ghlApiKey?: string,
  ghlLocationId?: string,
  setterGhlId?: string,
  salesRepGhlId?: string
): Promise<{ 
  setterUserId?: string; 
  salesRepUserId?: string;
  setterGhlId?: string;
  salesRepGhlId?: string;
}> {
  const result: { 
    setterUserId?: string; 
    salesRepUserId?: string;
    setterGhlId?: string;
    salesRepGhlId?: string;
  } = {}
  
  // Always return the GHL IDs for storage
  if (setterGhlId) {
    result.setterGhlId = setterGhlId
  }
  if (salesRepGhlId) {
    result.salesRepGhlId = salesRepGhlId
  }
  
  try {
    // Process setter
    if (setterName && setterName.trim() && setterGhlId) {
      const setterEmail = await getGHLEmailForUser(setterName, ghlApiKey, ghlLocationId, setterGhlId)
      
      // Upsert to centralized ghl_users table
      try {
        const { data: ghlUserId, error: upsertError } = await supabase.rpc(
          'upsert_ghl_user' as any,
          {
            p_account_id: accountId,
            p_ghl_user_id: setterGhlId,
            p_name: setterName.trim(),
            p_email: setterEmail || null,
            p_primary_role: 'setter'
          }
        )
        
        if (upsertError) {
          console.error('❌ Failed to upsert setter to ghl_users:', upsertError)
        } else {
          console.log('✅ Successfully upserted setter to ghl_users:', ghlUserId)
        }
      } catch (upsertError) {
        console.error('❌ Exception during setter upsert:', upsertError)
      }
      
      // Check if setter already exists as a real user through account_access
      if (setterEmail) {
        const { data: existingUserAccess } = await supabase
          .from('account_access')
          .select('user_id, profiles!inner(id, email)')
          .eq('account_id', accountId)
          .eq('profiles.email', setterEmail)
          .eq('is_active', true)
          .single()
        
        if (existingUserAccess) {
          result.setterUserId = existingUserAccess.user_id
          
          // Update ghl_users table to link to app user
          await supabase
            .from('ghl_users' as any)
            .update({ app_user_id: existingUserAccess.user_id, is_invited: true } as any)
            .eq('account_id', accountId)
            .eq('ghl_user_id', setterGhlId)
          
          console.log('✅ Found existing setter user:', setterEmail)
        } else {
          console.log('⚠️ Setter not found in app users - stored in ghl_users for later invitation:', setterName)
        }
      }
    }

    // Process sales rep
    if (salesRepName && salesRepName.trim() && salesRepGhlId) {
      const salesRepEmail = await getGHLEmailForUser(salesRepName, ghlApiKey, ghlLocationId, salesRepGhlId)
      
      // Upsert to centralized ghl_users table
      try {
        const { data: ghlUserId, error: upsertError } = await supabase.rpc(
          'upsert_ghl_user' as any,
          {
            p_account_id: accountId,
            p_ghl_user_id: salesRepGhlId,
            p_name: salesRepName.trim(),
            p_email: salesRepEmail || null,
            p_primary_role: 'sales_rep'
          }
        )
        
        if (upsertError) {
          console.error('❌ Failed to upsert sales rep to ghl_users:', upsertError)
        } else {
          console.log('✅ Successfully upserted sales rep to ghl_users:', ghlUserId)
        }
      } catch (upsertError) {
        console.error('❌ Exception during sales rep upsert:', upsertError)
      }
      
      // Check if sales rep already exists as a real user through account_access
      if (salesRepEmail) {
        const { data: existingUserAccess } = await supabase
          .from('account_access')
          .select('user_id, profiles!inner(id, email)')
          .eq('account_id', accountId)
          .eq('profiles.email', salesRepEmail)
          .eq('is_active', true)
          .single()
        
        if (existingUserAccess) {
          result.salesRepUserId = existingUserAccess.user_id
          
          // Update ghl_users table to link to app user
          await supabase
            .from('ghl_users' as any)
            .update({ app_user_id: existingUserAccess.user_id, is_invited: true } as any)
            .eq('account_id', accountId)
            .eq('ghl_user_id', salesRepGhlId)
          
          console.log('✅ Found existing sales rep user:', salesRepEmail)
        } else {
          console.log('⚠️ Sales rep not found in app users - stored in ghl_users for later invitation:', salesRepName)
        }
      }
    }

    return result
  } catch (error) {
    console.error('Error ensuring users exist for data:', error)
    return result
  }
}

// Legacy function that creates data users - keeping for compatibility but marking as deprecated
export async function createDataUserIfNotExists(
  supabase: ReturnType<typeof createClient<Database>>,
  accountId: string,
  name: string,
  role: 'setter' | 'sales_rep',
  email?: string
): Promise<string | null> {
  console.warn('⚠️ createDataUserIfNotExists is deprecated - use ensureUsersExistForData instead')
  
  try {
    const { data: userId } = await supabase.rpc(
      'create_data_user_if_not_exists',
      {
        p_account_id: accountId,
        p_name: name.trim(),
        p_role: role,
        p_email: email || undefined
      }
    )
    return userId
  } catch (error) {
    console.error('Error creating data user:', error)
    return null
  }
}

// Helper function to get email from GHL API (if available)
async function getGHLEmailForUser(
  userName: string,
  ghlApiKey?: string,
  ghlLocationId?: string,
  ghlUserId?: string
): Promise<string | null> {
  if (!ghlApiKey) return null
  
  try {
    console.log(`🔍 Looking up GHL email for user: ${userName}${ghlUserId ? ` (ID: ${ghlUserId})` : ''}`)
    
    const headers = {
      'Authorization': `Bearer ${ghlApiKey}`,
      'Version': '2021-07-28',
      'Accept': 'application/json',
    }
    
    // If we have a specific user ID, use the direct endpoint first
    if (ghlUserId) {
      try {
        const directResponse = await fetch(`https://services.leadconnectorhq.com/users/${ghlUserId}`, { headers })
        if (directResponse.ok) {
          const userData = await directResponse.json()
          if (userData.email) {
            console.log(`✅ Found GHL email via direct lookup for ${userName}: ${userData.email}`)
            return userData.email
          }
        }
      } catch (directError) {
        console.warn(`Failed direct user lookup for ${ghlUserId}:`, directError)
      }
    }
    
    // Fallback to searching through user lists
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
            console.log(`✅ Found GHL email via search for ${userName}: ${email}`)
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