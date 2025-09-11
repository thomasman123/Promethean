import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { userMetricsEngine } from '@/lib/metrics/user-metrics-engine'
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
      userIds, 
      metricName, 
      dateRange,
      roleFilter 
    } = body

    // Validate required fields
    if (!accountId || !userIds || !metricName || !dateRange) {
      return NextResponse.json(
        { error: 'Missing required fields: accountId, userIds, metricName, dateRange' },
        { status: 400 }
      )
    }

    // Convert dateRange from { from: Date, to: Date } to string format
    let startDate: string
    let endDate: string

    if (dateRange.from && dateRange.to) {
      // Handle Date objects from frontend
      startDate = format(new Date(dateRange.from), 'yyyy-MM-dd')
      endDate = format(new Date(dateRange.to), 'yyyy-MM-dd')
    } else if (dateRange.start && dateRange.end) {
      // Handle string format (fallback)
      startDate = dateRange.start
      endDate = dateRange.end
    } else {
      return NextResponse.json(
        { error: 'Invalid dateRange format. Expected { from: Date, to: Date } or { start: string, end: string }' },
        { status: 400 }
      )
    }

    console.log(`Processing user metrics request:`, {
      metricName,
      accountId,
      startDate,
      endDate,
      userCount: userIds.length
    })

    // Get metric definition
    const metricDefinition = getMetric(metricName)
    if (!metricDefinition) {
      return NextResponse.json(
        { error: `Metric '${metricName}' not found` },
        { status: 400 }
      )
    }

    // Check user access to account
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

    // Get user profiles for display information
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .in('id', userIds)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return NextResponse.json({ error: 'Failed to fetch user profiles' }, { status: 500 })
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ userMetrics: [] })
    }

    // Get account roles for users
    const { data: accountRoles } = await supabase
      .from('account_access')
      .select('user_id, role')
      .eq('account_id', accountId)
      .in('user_id', userIds)

    const accountRoleMap = new Map(accountRoles?.map(ar => [ar.user_id, ar.role]) || [])

    console.log(`Calculating ${metricName} for ${profiles.length} users using UserMetricsEngine`)

    // Use the new user metrics engine with properly formatted dates
    const metricsResponse = await userMetricsEngine.calculateForUsers({
      metricName,
      accountId,
      startDate,
      endDate,
      userIds
    })

    console.log(`UserMetricsEngine response:`, {
      resultsCount: metricsResponse.results.length,
      executionTimeMs: metricsResponse.executionTimeMs,
      sampleResults: metricsResponse.results.slice(0, 3)
    })

    // Transform results to match the expected format
    const userMetrics = profiles.map(profile => {
      const accountRole = accountRoleMap.get(profile.id) || profile.role
      const metricResult = metricsResponse.results.find(r => r.userId === profile.id)
      
      if (!metricResult) {
        return {
          userId: profile.id,
          name: profile.full_name,
          email: profile.email,
          role: profile.role,
          accountRole: accountRole,
          value: 0,
          displayValue: '0'
        }
      }

      // Create display value based on role detection
      let displayValue = metricResult.value.toString()
      
      if (metricResult.role === 'both' && metricResult.breakdown) {
        displayValue = `${metricResult.value} (${metricResult.breakdown.asSetter} setter + ${metricResult.breakdown.asRep} rep)`
      } else if (metricResult.role === 'rep') {
        displayValue = `${metricResult.value} (rep)`
      } else if (metricResult.role === 'setter') {
        displayValue = `${metricResult.value} (setter)`
      }

      return {
        userId: profile.id,
        name: profile.full_name,
        email: profile.email,
        role: profile.role,
        accountRole: accountRole,
        actualRole: metricResult.role, // Include the detected role
        value: metricResult.value,
        displayValue: displayValue,
        breakdown: metricResult.breakdown
      }
    })

    console.log(`UserMetricsEngine completed in ${metricsResponse.executionTimeMs}ms`)

    return NextResponse.json({
      userMetrics,
      executionTimeMs: metricsResponse.executionTimeMs,
      executedAt: metricsResponse.executedAt
    })

  } catch (error) {
    console.error('Error in user-metrics route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 