import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const campaignId = searchParams.get('campaignId') // DB UUID of meta_campaigns.id

    if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: access } = await supabase
      .from('account_access')
      .select('role')
      .eq('user_id', user.id)
      .eq('account_id', accountId)
      .eq('is_active', true)
      .single()

    if (!access) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

    let query = supabase
      .from('meta_ad_sets')
      .select('id, meta_ad_set_id, ad_set_name, status, meta_campaign_id')
      .eq('account_id', accountId)
      .order('ad_set_name', { ascending: true })

    if (campaignId) query = query.eq('meta_campaign_id', campaignId)

    const { data: adSets, error } = await query

    if (error) {
      console.error('DB error fetching ad sets:', error)
      return NextResponse.json({ error: 'Failed to fetch ad sets' }, { status: 500 })
    }

    return NextResponse.json({ success: true, adSets: adSets || [] })
  } catch (e) {
    console.error('Error in Meta ad sets API:', e)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
} 