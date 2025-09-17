import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { userMetricsEngine } from '@/lib/metrics/user-metrics-engine'
import { getMetric } from '@/lib/metrics/registry'
import { format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns'

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
      userIds,
      metricName, 
      dateRange,
      periodType = 'weekly', // 'daily', 'weekly', 'monthly'
      roleFilter,
      options
    } = body

    // Validate required fields
    if (!accountId || !userIds || !metricName || !dateRange) {
      return NextResponse.json(
        { error: 'Missing required fields: accountId, userIds, metricName, dateRange' },
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

    // Get user profiles for display information
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .in('id', userIds)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return NextResponse.json({ error: 'Failed to fetch user profiles' }, { status: 500 })
    }

    console.log(`Calculating ${metricName} user-period matrix for account ${accountId} (${periodType})`)

    // Generate periods based on type
    let periods: Array<{ key: string; label: string; startDate: string; endDate: string }> = []
    
    if (periodType === 'daily') {
      const days = eachDayOfInterval({ start: startDate, end: endDate })
      periods = days.map(day => ({
        key: format(day, 'yyyy-MM-dd'),
        label: format(day, 'M/d'),
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
          label: `W/E ${format(weekEnd, 'M/d')}`,
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

    // Calculate metric for each user in each period
    const userPeriodMetrics = await Promise.all(
      userIds.map(async (userId: string) => {
        const userProfile = profiles?.find(p => p.id === userId)
        
        const periodResults = await Promise.all(
          periods.map(async (period) => {
            try {
              const response = await userMetricsEngine.calculateForUsers({
                metricName,
                accountId,
                startDate: period.startDate,
                endDate: period.endDate,
                userIds: [userId],
                options
              })

              const userMetric = response.results.find(um => um.userId === userId)
              const value = userMetric?.value || 0
              const displayValue = userMetric?.displayValue || '0'

              return {
                periodKey: period.key,
                periodLabel: period.label,
                value,
                displayValue
              }
            } catch (error) {
              console.error(`Error calculating metric for user ${userId} in period ${period.label}:`, error)
              return {
                periodKey: period.key,
                periodLabel: period.label,
                value: 0,
                displayValue: '0'
              }
            }
          })
        )

        // Calculate total across all periods
        const totalValue = periodResults.reduce((sum, pr) => sum + pr.value, 0)

        return {
          userId,
          userName: userProfile?.full_name || 'Unknown User',
          userEmail: userProfile?.email || '',
          userRole: userProfile?.role || 'setter',
          periods: periodResults,
          total: {
            value: totalValue,
            displayValue: String(totalValue)
          }
        }
      })
    )

    console.log(`Calculated ${metricName} for ${userPeriodMetrics.length} users across ${periods.length} periods`)

    return NextResponse.json({
      userPeriodMetrics,
      periods: periods.map(p => ({ key: p.key, label: p.label })),
      metricName,
      periodType,
      totalUsers: userPeriodMetrics.length,
      totalPeriods: periods.length
    })

  } catch (error) {
    console.error('User period metrics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 