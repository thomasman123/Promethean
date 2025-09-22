import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

async function getValidMetaAccessToken(account: any, supabase: any): Promise<string | null> {
  try {
    const authType = account.meta_auth_type || 'oauth2'
    const currentAccessToken = account.meta_access_token as string | null
    const expiresAtIso = account.meta_token_expires_at as string | null

    if (authType !== 'oauth2') return currentAccessToken || null

    const clientId = process.env.META_APP_ID
    const clientSecret = process.env.META_APP_SECRET
    if (!clientId || !clientSecret) return currentAccessToken || null

    const now = Date.now()
    const expiresAtMs = expiresAtIso ? new Date(expiresAtIso).getTime() : 0
    const skewMs = 24 * 60 * 60 * 1000 // 24 hours buffer for proactive renewal
    const needsRefresh = !currentAccessToken || !expiresAtMs || now >= (expiresAtMs - skewMs)
    
    if (!needsRefresh) return currentAccessToken as string

    return currentAccessToken || null
  } catch (e) {
    return account?.meta_access_token || null
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

    const body = await request.json()
    const { accountId } = body

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
    }

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Load account
    const { data: account } = await supabase
      .from('accounts')
      .select('id, name, meta_user_id, meta_access_token, meta_token_expires_at, meta_auth_type')
      .eq('id', accountId)
      .single()
    
    if (!account) {
      return NextResponse.json({ error: 'Account not found or not connected to Meta Ads' }, { status: 404 })
    }

    const accessToken = await getValidMetaAccessToken(account, supabase)
    if (!accessToken) {
      return NextResponse.json({ error: 'No valid Meta access token available' }, { status: 401 })
    }

    // Get mapped ad accounts
    const { data: metaAdAccounts } = await supabase
      .from('meta_ad_accounts')
      .select('*')
      .eq('account_id', accountId)
      .eq('is_active', true)

    if (!metaAdAccounts || metaAdAccounts.length === 0) {
      return NextResponse.json({ error: 'No mapped ad accounts found' }, { status: 400 })
    }

    const metaAdAccountId = metaAdAccounts[0].meta_ad_account_id

    console.log(`🔍 DEBUG: Testing Meta API calls for ad account: ${metaAdAccountId}`)

    const debugResults = {
      account_id: accountId,
      meta_ad_account_id: metaAdAccountId,
      access_token_length: accessToken.length,
      tests: [] as any[]
    }

    // Test 1: Try last 7 days with specific date range
    try {
      const last7Days = new Date()
      last7Days.setDate(last7Days.getDate() - 7)
      const dateStart = last7Days.toISOString().split('T')[0]
      const dateEnd = new Date().toISOString().split('T')[0]

      console.log(`🔍 Test 1: Last 7 days (${dateStart} to ${dateEnd})`)

      const test1Response = await fetch(
        `https://graph.facebook.com/v21.0/${metaAdAccountId}/insights?fields=impressions,clicks,spend,reach,frequency,cpm,cpc,ctr,campaign_id,campaign_name&time_range={'since':'${dateStart}','until':'${dateEnd}'}&time_increment=1&level=campaign&access_token=${accessToken}`
      )

      const test1Data = await test1Response.json()
      debugResults.tests.push({
        test: 'Last 7 days - Campaign level',
        url: `insights?time_range={'since':'${dateStart}','until':'${dateEnd}'}&time_increment=1&level=campaign`,
        status: test1Response.status,
        records_returned: test1Data.data?.length || 0,
        total_spend: test1Data.data?.reduce((sum: number, record: any) => sum + parseFloat(record.spend || '0'), 0) || 0,
        date_range_returned: test1Data.data?.length > 0 ? {
          earliest: test1Data.data[0]?.date_start,
          latest: test1Data.data[test1Data.data.length - 1]?.date_start
        } : null,
        error: test1Data.error || null
      })
    } catch (error) {
      debugResults.tests.push({
        test: 'Last 7 days - Campaign level',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Test 2: Try date_preset=last_7d
    try {
      console.log(`🔍 Test 2: date_preset=last_7d`)

      const test2Response = await fetch(
        `https://graph.facebook.com/v21.0/${metaAdAccountId}/insights?fields=impressions,clicks,spend,reach,frequency,cpm,cpc,ctr,campaign_id,campaign_name&date_preset=last_7d&time_increment=1&level=campaign&access_token=${accessToken}`
      )

      const test2Data = await test2Response.json()
      debugResults.tests.push({
        test: 'date_preset=last_7d - Campaign level',
        url: `insights?date_preset=last_7d&time_increment=1&level=campaign`,
        status: test2Response.status,
        records_returned: test2Data.data?.length || 0,
        total_spend: test2Data.data?.reduce((sum: number, record: any) => sum + parseFloat(record.spend || '0'), 0) || 0,
        date_range_returned: test2Data.data?.length > 0 ? {
          earliest: test2Data.data[0]?.date_start,
          latest: test2Data.data[test2Data.data.length - 1]?.date_start
        } : null,
        error: test2Data.error || null
      })
    } catch (error) {
      debugResults.tests.push({
        test: 'date_preset=last_7d - Campaign level',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Test 3: Try date_preset=maximum
    try {
      console.log(`🔍 Test 3: date_preset=maximum`)

      const test3Response = await fetch(
        `https://graph.facebook.com/v21.0/${metaAdAccountId}/insights?fields=impressions,clicks,spend,reach,frequency,cpm,cpc,ctr,campaign_id,campaign_name&date_preset=maximum&time_increment=1&level=campaign&access_token=${accessToken}`
      )

      const test3Data = await test3Response.json()
      debugResults.tests.push({
        test: 'date_preset=maximum - Campaign level',
        url: `insights?date_preset=maximum&time_increment=1&level=campaign`,
        status: test3Response.status,
        records_returned: test3Data.data?.length || 0,
        total_spend: test3Data.data?.reduce((sum: number, record: any) => sum + parseFloat(record.spend || '0'), 0) || 0,
        date_range_returned: test3Data.data?.length > 0 ? {
          earliest: test3Data.data[0]?.date_start,
          latest: test3Data.data[test3Data.data.length - 1]?.date_start
        } : null,
        sample_records: test3Data.data?.slice(0, 3) || [],
        error: test3Data.error || null
      })
    } catch (error) {
      debugResults.tests.push({
        test: 'date_preset=maximum - Campaign level',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Test 4: Try without time_increment (aggregated data)
    try {
      console.log(`🔍 Test 4: Aggregated data (no time_increment)`)

      const test4Response = await fetch(
        `https://graph.facebook.com/v21.0/${metaAdAccountId}/insights?fields=impressions,clicks,spend,reach,frequency,cpm,cpc,ctr,campaign_id,campaign_name&date_preset=last_7d&level=campaign&access_token=${accessToken}`
      )

      const test4Data = await test4Response.json()
      debugResults.tests.push({
        test: 'Aggregated last_7d - Campaign level',
        url: `insights?date_preset=last_7d&level=campaign (no time_increment)`,
        status: test4Response.status,
        records_returned: test4Data.data?.length || 0,
        total_spend: test4Data.data?.reduce((sum: number, record: any) => sum + parseFloat(record.spend || '0'), 0) || 0,
        sample_records: test4Data.data?.slice(0, 3) || [],
        error: test4Data.error || null
      })
    } catch (error) {
      debugResults.tests.push({
        test: 'Aggregated last_7d - Campaign level',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    console.log(`🔍 DEBUG: Completed ${debugResults.tests.length} API tests`)

    return NextResponse.json({
      success: true,
      message: 'Meta API debug tests completed',
      ...debugResults
    })

  } catch (error) {
    console.error('Error in Meta API debug:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
} 