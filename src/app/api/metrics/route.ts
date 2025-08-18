import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'
import { metricsEngine } from '@/lib/metrics/engine'
import { MetricRequest } from '@/lib/metrics/types'
import { getAllMetricNames } from '@/lib/metrics/registry'

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
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    if (!body.metricName || !body.filters) {
      return NextResponse.json({ 
        error: 'Invalid request. Must include metricName and filters.' 
      }, { status: 400 })
    }

    const { filters } = body
    if (!filters.dateRange || !filters.dateRange.start || !filters.dateRange.end || !filters.accountId) {
      return NextResponse.json({ 
        error: 'Invalid filters. Must include dateRange (start, end) and accountId.' 
      }, { status: 400 })
    }

    const metricRequest: MetricRequest = {
      metricName: body.metricName,
      filters: {
        dateRange: { start: filters.dateRange.start, end: filters.dateRange.end },
        accountId: filters.accountId,
        repIds: filters.repIds,
        setterIds: filters.setterIds,
        utm_source: filters.utm_source,
        utm_medium: filters.utm_medium,
        utm_campaign: filters.utm_campaign,
        utm_content: filters.utm_content,
        utm_term: filters.utm_term,
        utm_id: filters.utm_id,
        source_category: filters.source_category,
        specific_source: filters.specific_source,
        session_source: filters.session_source,
        referrer: filters.referrer,
        fbclid: filters.fbclid,
        fbc: filters.fbc,
        fbp: filters.fbp,
        gclid: filters.gclid,
      }
    }

    const requestedVizType = body.vizType;
    const requestedBreakdown = body.breakdown;

    const result = await metricsEngine.execute(metricRequest, {
      vizType: requestedVizType,
      dynamicBreakdown: requestedBreakdown
    })

    return NextResponse.json(result)

  } catch (error) {
    console.error('Metrics API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const path = url.pathname

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
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (path.endsWith('/options')) {
      const accountId = url.searchParams.get('accountId')
      if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 })

      const fields = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','utm_id','source_category','specific_source','session_source','contact_referrer']
      const result: Record<string, string[]> = {}

      for (const f of fields) {
        const col = f
        const sets: string[][] = []
        const { data: a } = await supabase
          .from('appointments')
          .select(col)
          .eq('account_id', accountId)
          .not(col as any, 'is', null as any)
        if (a) sets.push(Array.from(new Set(a.map((r: any) => r[col]).filter(Boolean))))
        const { data: d } = await supabase
          .from('discoveries')
          .select(col)
          .eq('account_id', accountId)
          .not(col as any, 'is', null as any)
        if (d) sets.push(Array.from(new Set(d.map((r: any) => r[col]).filter(Boolean))))
        const { data: dl } = await supabase
          .from('dials')
          .select(col)
          .eq('account_id', accountId)
          .not(col as any, 'is', null as any)
        if (dl) sets.push(Array.from(new Set(dl.map((r: any) => r[col]).filter(Boolean))))

        result[f === 'contact_referrer' ? 'referrer' : f] = Array.from(new Set((sets.flat()).filter(Boolean))).slice(0, 200)
      }

      return NextResponse.json(result)
    }

    const metricNames = getAllMetricNames()
    
    return NextResponse.json({
      metrics: metricNames,
      count: metricNames.length
    })

  } catch (error) {
    console.error('Metrics API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 