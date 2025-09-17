import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { metricsEngine } from '@/lib/metrics/engine'
import { getMetric } from '@/lib/metrics/registry'
import { format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfWeek, startOfMonth } from 'date-fns'

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
      periodType = 'weekly', // 'daily', 'weekly', 'monthly'
      options
    } = body

    // Validate required fields
    if (!accountId || !metricName || !dateRange) {
      return NextResponse.json(
        { error: 'Missing required fields: accountId, metricName, dateRange' },
        { status: 400 }
      )
    }

    // Convert dateRange to Date objects
    const startDate = new Date(dateRange.start)
    const endDate = new Date(dateRange.end)

    // Get metric definition
    const metricDefinition = getMetric(metricName)
    if (!metricDefinition) {
      return NextResponse.json(
        { error: `Metric '${metricName}' not found` },
        { status: 404 }
      )
    }

    // Check account access
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isGlobalAdmin = profileData?.role === 'admin'

    if (!isGlobalAdmin) {
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

    console.log(`Calculating ${metricName} time series for account ${accountId} (${periodType})`)

    // Generate periods based on type
    let periods: Array<{ key: string; label: string; startDate: string; endDate: string }> = []
    
    if (periodType === 'daily') {
      const days = eachDayOfInterval({ start: startDate, end: endDate })
      periods = days.map(day => ({
        key: format(day, 'yyyy-MM-dd'),
        label: format(day, 'MMM d'),
        startDate: format(day, 'yyyy-MM-dd'),
        endDate: format(day, 'yyyy-MM-dd')
      }))
    } else if (periodType === 'weekly') {
      const weeks = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 }) // Monday start
      periods = weeks.map(weekStart => {
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6) // End of week
        return {
          key: format(weekStart, 'yyyy-MM-dd'),
          label: `Week of ${format(weekStart, 'MMM d')}`,
          startDate: format(weekStart, 'yyyy-MM-dd'),
          endDate: format(weekEnd > endDate ? endDate : weekEnd, 'yyyy-MM-dd')
        }
      })
    } else if (periodType === 'monthly') {
      const months = eachMonthOfInterval({ start: startDate, end: endDate })
      periods = months.map(monthStart => {
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0) // Last day of month
        return {
          key: format(monthStart, 'yyyy-MM-dd'),
          label: format(monthStart, 'MMM yyyy'),
          startDate: format(monthStart, 'yyyy-MM-dd'),
          endDate: format(monthEnd > endDate ? endDate : monthEnd, 'yyyy-MM-dd')
        }
      })
    }

    // Calculate metric for each period
    const periodMetrics = await Promise.all(
      periods.map(async (period) => {
        try {
          const response = await metricsEngine.execute({
            metricName,
            filters: {
              accountId,
              dateRange: {
                start: period.startDate,
                end: period.endDate
              }
            }
          }, { widgetSettings: options })

          let value = 0
          let displayValue = '0'

          if (response.result.type === 'total' && response.result.data?.value !== undefined) {
            value = response.result.data.value
            displayValue = String(value)
          }

          return {
            periodKey: period.key,
            periodLabel: period.label,
            value,
            displayValue
          }
        } catch (error) {
          console.error(`Error calculating metric for period ${period.label}:`, error)
          return {
            periodKey: period.key,
            periodLabel: period.label,
            value: 0,
            displayValue: '0'
          }
        }
      })
    )

    console.log(`Calculated ${metricName} for ${periodMetrics.length} periods`)

    return NextResponse.json({
      periodMetrics,
      metricName,
      periodType,
      totalPeriods: periodMetrics.length
    })

  } catch (error) {
    console.error('Account metrics time series API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 