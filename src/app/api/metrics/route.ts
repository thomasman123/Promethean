import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { metricsEngine } from '@/lib/metrics/engine'
import { MetricRequest } from '@/lib/metrics/types'
import { getAllMetricNames } from '@/lib/metrics/registry'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    console.log('🐛 DEBUG - Metrics API: Checking authentication...')
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    console.log('🐛 DEBUG - Metrics API Auth Result:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      authError: authError?.message,
    })
    
    if (authError || !session) {
      console.log('🐛 DEBUG - Metrics API: Authentication failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('🐛 DEBUG - Metrics API: Authentication successful')

    // Parse request body
    const body = await request.json()
    
    // Validate request structure
    if (!body.metricName || !body.filters) {
      return NextResponse.json({ 
        error: 'Invalid request. Must include metricName and filters.' 
      }, { status: 400 })
    }

    // Validate filters structure
    const { filters } = body
    if (!filters.dateRange || !filters.dateRange.start || !filters.dateRange.end || !filters.accountId) {
      return NextResponse.json({ 
        error: 'Invalid filters. Must include dateRange (start, end) and accountId.' 
      }, { status: 400 })
    }

    // Create metric request
    const metricRequest: MetricRequest = {
      metricName: body.metricName,
      filters: {
        dateRange: {
          start: filters.dateRange.start,
          end: filters.dateRange.end
        },
        accountId: filters.accountId,
        repIds: filters.repIds,
        setterIds: filters.setterIds
      }
    }

    // Execute metric calculation
    const result = await metricsEngine.execute(metricRequest)

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
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Return list of available metrics
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