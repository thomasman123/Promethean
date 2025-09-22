import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

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

    // require admin or moderator on this account
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const isGlobalAdmin = profile?.role === 'admin'
    if (!isGlobalAdmin) {
      const { data: access } = await supabase
        .from('account_access')
        .select('role')
        .eq('user_id', user.id)
        .eq('account_id', accountId)
        .eq('is_active', true)
        .single()
      if (!access || !['moderator'].includes(access.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }

    console.log(`🚀 Starting ultra-fast batched Meta Ads sync for account: ${accountId}`)

    // Call the main sync endpoint with batched approach (campaigns only)
    const syncResponse = await fetch(`${request.nextUrl.origin}/api/meta-ads/sync-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || ''
      },
      body: JSON.stringify({
        accountId,
        daysBack: 1,
        syncType: 'campaigns' // Ultra-fast batched sync - campaigns, ad sets, ads in 1 API call
      })
    })

    const syncData = await syncResponse.json()

    if (!syncResponse.ok) {
      return NextResponse.json(syncData, { status: syncResponse.status })
    }

    return NextResponse.json({
      success: true,
      message: `Ultra-fast sync completed! ${syncData.campaignsSynced || 0} campaigns, ${syncData.adSetsSynced || 0} ad sets, ${syncData.adsSynced || 0} ads + ${syncData.insightsSynced || 0} metrics (${syncData.apiCallsUsed || 1} API call)`,
      ...syncData
    })

  } catch (error) {
    console.error('❌ Error in initial Meta Ads sync:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
} 