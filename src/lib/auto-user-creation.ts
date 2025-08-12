import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Helper function to auto-create users for data linking
export async function ensureUsersExistForData(
  supabase: ReturnType<typeof createClient<Database>>,
  accountId: string,
  setterName: string | null,
  salesRepName: string | null,
  ghlApiKey?: string
): Promise<{ setterUserId?: string; salesRepUserId?: string }> {
  const result: { setterUserId?: string; salesRepUserId?: string } = {}
  
  try {
    // Process setter
    if (setterName && setterName.trim()) {
      const setterEmail = await getGHLEmailForUser(setterName, ghlApiKey)
      const { data: setterUserId } = await supabase.rpc(
        'create_data_user_if_not_exists',
        {
          p_account_id: accountId,
          p_name: setterName.trim(),
          p_role: 'setter',
          p_email: setterEmail
        }
      )
      if (setterUserId) result.setterUserId = setterUserId
    }

    // Process sales rep
    if (salesRepName && salesRepName.trim()) {
      const salesRepEmail = await getGHLEmailForUser(salesRepName, ghlApiKey)
      const { data: salesRepUserId } = await supabase.rpc(
        'create_data_user_if_not_exists',
        {
          p_account_id: accountId,
          p_name: salesRepName.trim(),
          p_role: 'sales_rep',
          p_email: salesRepEmail
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
  ghlApiKey?: string
): Promise<string | null> {
  if (!ghlApiKey) return null
  
  try {
    // TODO: Implement GHL API call to find user by name and get their email
    // For now, return null to use generated email
    console.log(`TODO: Look up GHL email for user: ${userName}`)
    return null
  } catch (error) {
    console.error('Error fetching GHL email for user:', userName, error)
    return null
  }
} 