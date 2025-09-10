import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { metricsEngine } from '@/lib/metrics/engine'
import { createMetricRequest } from '@/lib/metrics'
import { getMetric } from '@/lib/metrics/registry'

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

    // Get metric definition
    const metricDefinition = getMetric(metricName)
    if (!metricDefinition) {
      return NextResponse.json(
        { error: `Metric '${metricName}' not found` },
        { status: 400 }
      )
    }

    // Check user access to account
    const { data: userAccess } = await supabase
      .from('account_access')
      .select('role')
      .eq('user_id', user.id)
      .eq('account_id', accountId)
      .single()

    if (!userAccess) {
      return NextResponse.json({ error: 'Access denied to this account' }, { status: 403 })
    }

    // Get user profiles for context
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .in('id', userIds)

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ error: 'No users found' }, { status: 404 })
    }

    // Calculate metrics for each user
    const userMetrics = await Promise.all(
      profiles.map(async (profile) => {
        try {
          // Determine the appropriate filter based on user role and metric
          let filters: any = {
            dateRange,
            accountId,
          }

          // Add role-specific filters based on the user's role
          if (profile.role === 'setter' || profile.role === 'admin') {
            filters.setterIds = [profile.id]
          } else if (profile.role === 'sales_rep' || profile.role === 'admin') {
            filters.repIds = [profile.id]
          }

          // For admin users, we might want to show combined metrics
          if (profile.role === 'admin') {
            // For admin, show metrics for both setter and rep activities
            // We'll need to make two requests and combine them
            const setterRequest = createMetricRequest(metricName, accountId, dateRange.start, dateRange.end, {
              setterIds: [profile.id]
            })
            const repRequest = createMetricRequest(metricName, accountId, dateRange.start, dateRange.end, {
              repIds: [profile.id]
            })

            const [setterResult, repResult] = await Promise.all([
              metricsEngine.execute(setterRequest),
              metricsEngine.execute(repRequest)
            ])

            // Combine results based on metric type
            let combinedValue = 0
            if (metricDefinition.unit === 'count' || metricDefinition.unit === 'currency') {
              // For counts and currency, add them together
              combinedValue = (setterResult.result.data as any).value + (repResult.result.data as any).value
            } else if (metricDefinition.unit === 'percent') {
              // For percentages, we need to recalculate based on combined data
              // This is complex and might require custom logic per metric
              combinedValue = Math.max((setterResult.result.data as any).value, (repResult.result.data as any).value)
            } else {
              // For other units, take the maximum or average
              combinedValue = ((setterResult.result.data as any).value + (repResult.result.data as any).value) / 2
            }

            return {
              userId: profile.id,
              name: profile.full_name,
              email: profile.email,
              role: profile.role,
              value: combinedValue,
              rawSetterValue: (setterResult.result.data as any).value,
              rawRepValue: (repResult.result.data as any).value
            }
          } else {
            // For regular users, calculate single metric
            const request = createMetricRequest(metricName, accountId, dateRange.start, dateRange.end, filters)
            const result = await metricsEngine.execute(request)

            return {
              userId: profile.id,
              name: profile.full_name,
              email: profile.email,
              role: profile.role,
              value: (result.result.data as any).value || 0
            }
          }
        } catch (error) {
          console.error(`Error calculating metric for user ${profile.id}:`, error)
          return {
            userId: profile.id,
            name: profile.full_name,
            email: profile.email,
            role: profile.role,
            value: 0,
            error: 'Calculation failed'
          }
        }
      })
    )

    return NextResponse.json({
      metricName,
      metricDefinition: {
        name: metricDefinition.name,
        description: metricDefinition.description,
        unit: metricDefinition.unit
      },
      dateRange,
      accountId,
      userMetrics
    })

  } catch (error) {
    console.error('Error in user-metrics API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 