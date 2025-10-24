import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Admin endpoint to fix missing ghl_locations entries
 * This adds any accounts that have ghl_location_id but no entry in ghl_locations table
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log('🔧 Checking for accounts with missing ghl_locations entries...')

    // Find all accounts with ghl_location_id
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('id, name, ghl_location_id')
      .not('ghl_location_id', 'is', null)

    if (accountsError) {
      console.error('❌ Error fetching accounts:', accountsError)
      return NextResponse.json({ error: accountsError.message }, { status: 500 })
    }

    console.log(`📋 Found ${accounts.length} accounts with ghl_location_id`)

    const results = []
    let fixed = 0
    let alreadyExists = 0
    let errors = 0

    for (const account of accounts) {
      try {
        // Check if location already exists in ghl_locations
        const { data: existingLocation } = await supabase
          .from('ghl_locations')
          .select('*')
          .eq('account_id', account.id)
          .eq('location_id', account.ghl_location_id)
          .single()

        if (existingLocation) {
          console.log(`✅ Location already exists for ${account.name}`)
          alreadyExists++
          results.push({
            account: account.name,
            locationId: account.ghl_location_id,
            status: 'already_exists'
          })
          continue
        }

        // Insert missing location
        console.log(`🔨 Adding missing location for ${account.name}`)
        const { data: insertedLocation, error: insertError } = await supabase
          .from('ghl_locations')
          .insert({
            account_id: account.id,
            location_id: account.ghl_location_id,
            location_name: `${account.name} - Primary Location`
          })
          .select()
          .single()

        if (insertError) {
          console.error(`❌ Failed to insert location for ${account.name}:`, insertError)
          errors++
          results.push({
            account: account.name,
            locationId: account.ghl_location_id,
            status: 'error',
            error: insertError.message
          })
          continue
        }

        console.log(`✅ Successfully added location for ${account.name}`)
        fixed++
        results.push({
          account: account.name,
          locationId: insertedLocation.location_id,
          locationName: insertedLocation.location_name,
          status: 'fixed'
        })
      } catch (err: any) {
        console.error(`❌ Error processing ${account.name}:`, err)
        errors++
        results.push({
          account: account.name,
          locationId: account.ghl_location_id,
          status: 'error',
          error: err.message
        })
      }
    }

    console.log(`🎉 Fix complete! Fixed: ${fixed}, Already exists: ${alreadyExists}, Errors: ${errors}`)

    return NextResponse.json({
      success: true,
      summary: {
        totalAccounts: accounts.length,
        fixed,
        alreadyExists,
        errors
      },
      results
    })
  } catch (err: any) {
    console.error('❌ Unexpected error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

