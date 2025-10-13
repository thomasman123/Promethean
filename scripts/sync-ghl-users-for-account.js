#!/usr/bin/env node

/**
 * Script to manually sync GHL users for a specific account
 * Usage: node scripts/sync-ghl-users-for-account.js <account_id>
 */

import { createClient } from '@supabase/ssr'
import 'dotenv/config'

const ACCOUNT_ID = process.argv[2] || 'b78ea8cf-f327-4769-b4b8-1735acc0b9c3'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    cookies: {
      get() { return undefined },
      set() {},
      remove() {},
    },
  }
)

async function syncGHLUsers() {
  try {
    console.log(`🔍 Fetching account info for ${ACCOUNT_ID}...`)
    
    // Get account with GHL credentials
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id, name, ghl_api_key, ghl_location_id')
      .eq('id', ACCOUNT_ID)
      .single()

    if (accountError || !account) {
      console.error('❌ Account not found:', accountError)
      return
    }

    if (!account.ghl_api_key || !account.ghl_location_id) {
      console.error('❌ Account missing GHL credentials')
      return
    }

    console.log(`✅ Found account: ${account.name}`)
    console.log(`📍 Location ID: ${account.ghl_location_id}`)

    // Fetch users from GHL API
    console.log(`\n🔍 Fetching users from GHL API...`)
    const headers = {
      'Authorization': `Bearer ${account.ghl_api_key}`,
      'Version': '2021-07-28',
      'Accept': 'application/json',
    }

    let usersResponse
    try {
      // Try location-specific endpoint first
      usersResponse = await fetch(
        `https://services.leadconnectorhq.com/locations/${account.ghl_location_id}/users/`,
        { headers }
      )
    } catch (e) {
      console.warn('⚠️  Location endpoint failed, trying generic endpoint...')
      usersResponse = await fetch('https://services.leadconnectorhq.com/users/', { headers })
    }

    if (!usersResponse.ok) {
      console.error(`❌ GHL API error: ${usersResponse.status} ${usersResponse.statusText}`)
      const errorText = await usersResponse.text()
      console.error('Response:', errorText)
      return
    }

    const usersData = await usersResponse.json()
    const ghlUsers = usersData.users || usersData.data || []
    
    console.log(`✅ Found ${ghlUsers.length} users from GHL API`)

    if (ghlUsers.length === 0) {
      console.log('⚠️  No users found in GHL')
      return
    }

    // Get existing team members to exclude
    const { data: teamAccess } = await supabase
      .from('account_access')
      .select('user_id, account_id, profiles!inner(email, ghl_user_id)')
      .eq('account_id', ACCOUNT_ID)
      .eq('is_active', true)

    const existingEmails = new Set(
      (teamAccess || []).map(r => (r.profiles?.email || '').toLowerCase()).filter(Boolean)
    )
    const existingGhlIds = new Set(
      (teamAccess || []).map(r => r.profiles?.ghl_user_id).filter(Boolean)
    )

    console.log(`\n📋 Processing users...`)
    let inserted = 0
    let updated = 0
    let skipped = 0

    for (const u of ghlUsers) {
      const ghlUserId = u.id
      const email = u.email || u.userEmail
      const name = u.name || [u.firstName, u.lastName].filter(Boolean).join(' ') || 'Unknown'
      const emailLower = (email || '').toLowerCase()

      // Skip if already on team
      if (email && existingEmails.has(emailLower)) {
        console.log(`⏭️  Skipped ${name} (${email}) - already on team`)
        skipped++
        continue
      }
      if (ghlUserId && existingGhlIds.has(ghlUserId)) {
        console.log(`⏭️  Skipped ${name} - already on team (by GHL ID)`)
        skipped++
        continue
      }

      try {
        // Upsert into ghl_users table
        const { data, error } = await supabase.rpc('upsert_ghl_user', {
          p_account_id: ACCOUNT_ID,
          p_ghl_user_id: ghlUserId,
          p_name: name,
          p_email: email || null,
          p_first_name: u.firstName || null,
          p_last_name: u.lastName || null,
          p_phone: u.phone || null,
          p_primary_role: 'setter' // Default role for new users
        })

        if (error) {
          console.error(`❌ Failed to upsert ${name}:`, error)
        } else {
          console.log(`✅ Upserted ${name} (${email || 'no email'})`)
          inserted++
        }
      } catch (e) {
        console.error(`❌ Error upserting ${name}:`, e.message)
      }
    }

    console.log(`\n📊 Summary:`)
    console.log(`   ✅ Inserted/Updated: ${inserted}`)
    console.log(`   ⏭️  Skipped (already on team): ${skipped}`)
    console.log(`   📝 Total processed: ${ghlUsers.length}`)

    // Verify the results
    const { data: ghlUsersInDb, error: countError } = await supabase
      .from('ghl_users')
      .select('ghl_user_id, name, email, is_invited')
      .eq('account_id', ACCOUNT_ID)

    if (!countError && ghlUsersInDb) {
      console.log(`\n✅ Total GHL users in database for this account: ${ghlUsersInDb.length}`)
      console.log(`   📧 Pending invitation: ${ghlUsersInDb.filter(u => !u.is_invited).length}`)
    }

  } catch (error) {
    console.error('❌ Script error:', error)
  }
}

syncGHLUsers()

