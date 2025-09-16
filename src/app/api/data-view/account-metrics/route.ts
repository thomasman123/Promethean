import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { accountMetricsEngine } from '@/lib/metrics/account-metrics-engine'
import { getMetric } from '@/lib/metrics/registry'
import { format } from 'date-fns'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      accountId, 
      metricName, 
      dateRange,
      options
    } = body

    // Validate required fields
    if (!accountId || !metricName || !dateRange) {
      return NextResponse.json(
        { error: 'Missing required fields: accountId, metricName, dateRange' },
        { status: 400 }
      )
    }

    // Convert dateRange to string format
    let startDate: string
    let endDate: string

    if (dateRange.start && dateRange.end) {
      startDate = dateRange.start
      endDate = dateRange.end
    } else if (dateRange.from && dateRange.to) {
      startDate = format(new Date(dateRange.from), 'yyyy-MM-dd')
      endDate = format(new Date(dateRange.to), 'yyyy-MM-dd')
    } else {
      return NextResponse.json(
        { error: 'Invalid dateRange format' },
        { status: 400 }
      )
    }

    console.log(`Processing account metrics request:`, {
      metricName,
      accountId,
      startDate,
      endDate
    })

    // Get metric definition
    const metricDefinition = getMetric(metricName)
    if (!metricDefinition) {
      return NextResponse.json(
        { error: `Metric '${metricName}' not found` },
        { status: 404 }
      )
    }

    // Check account access (similar to user-metrics)
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isGlobalAdmin = profileData?.role === 'admin'

    if (!isGlobalAdmin) {
      // Non-global admins need explicit account access
      const { data: userAccess } = await supabase
        .from('account_access')
        .select('role')
        .eq('user_id', user.id)
        .eq('account_id', accountId)
        .single()

      if (!userAccess) {
        return NextResponse.json({ error: 'Access denied to this account' }, { status: 403 })
      }
    }

    console.log(`Calculating ${metricName} for account using AccountMetricsEngine`)

    // Use the account metrics engine
    const metricsResponse = await accountMetricsEngine.calculate({
      metricName,
      accountId,
      startDate,
      endDate,
      options
    })

    console.log(`AccountMetricsEngine response:`, {
      metricName: metricsResponse.metricName,
      value: metricsResponse.result.value,
      displayValue: metricsResponse.result.displayValue,
      executionTimeMs: metricsResponse.executionTimeMs
    })

    return NextResponse.json({
      accountMetric: metricsResponse.result,
      executedAt: metricsResponse.executedAt,
      executionTimeMs: metricsResponse.executionTimeMs
    })

  } catch (error) {
    console.error('Account metrics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 