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

    // Get user profiles for context with their account access
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .in('id', userIds)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return NextResponse.json({ error: 'Failed to fetch user profiles' }, { status: 500 })
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ error: 'No users found' }, { status: 404 })
    }

    // Get account access for these users
    const { data: accountAccess, error: accessError } = await supabase
      .from('account_access')
      .select('user_id, role')
      .eq('account_id', accountId)
      .in('user_id', userIds)

    if (accessError) {
      console.error('Error fetching account access:', accessError)
      return NextResponse.json({ error: 'Failed to fetch account access' }, { status: 500 })
    }

    // Create a map of user_id to account role
    const accountRoleMap = new Map()
    accountAccess?.forEach(access => {
      accountRoleMap.set(access.user_id, access.role)
    })

    console.log('Found profiles:', profiles)
    console.log('Account access map:', Object.fromEntries(accountRoleMap))

    // Calculate metrics for each user
    const userMetrics = await Promise.all(
      profiles.map(async (profile) => {
        try {
          const accountRole = accountRoleMap.get(profile.id) || profile.role
          console.log(`Calculating metrics for user: ${profile.full_name} (${profile.email}) - Profile Role: ${profile.role}, Account Role: ${accountRole}`)
          
          // Determine the appropriate filter based on user role and metric
          let filters: any = {
            dateRange,
            accountId,
          }

          // Add role-specific filters based on the user's ACCOUNT role and the metric table
          if (metricDefinition.query.table === 'appointments') {
            // For appointment metrics, filter based on user's actual role
            if (accountRole === 'sales_rep') {
              filters.repIds = [profile.id]
              console.log(`Appointments: filtering by repIds for ${profile.full_name} (sales_rep)`)
            } else if (accountRole === 'admin' || accountRole === 'moderator') {
              // For admin/moderator users, show metrics for both setter and rep activities
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
                combinedValue = Math.max((setterResult.result.data as any).value, (repResult.result.data as any).value)
              } else {
                // For other units, take the maximum or average
                combinedValue = ((setterResult.result.data as any).value + (repResult.result.data as any).value) / 2
              }

              console.log(`Admin/Moderator user ${profile.full_name} - Setter: ${(setterResult.result.data as any).value}, Rep: ${(repResult.result.data as any).value}, Combined: ${combinedValue}`)

              return {
                userId: profile.id,
                name: profile.full_name,
                email: profile.email,
                role: profile.role,
                accountRole: accountRole,
                value: combinedValue,
                rawSetterValue: (setterResult.result.data as any).value,
                rawRepValue: (repResult.result.data as any).value
              }
            } else {
              // For setters and others, filter by setter role
              filters.setterIds = [profile.id]
              console.log(`Appointments: filtering by setterIds for ${profile.full_name} (${accountRole})`)
            }
          } else if (metricDefinition.query.table === 'dials') {
            // For dials, filter by setter_user_id
            if (accountRole === 'setter' || accountRole === 'admin' || accountRole === 'moderator') {
              filters.setterIds = [profile.id]
            }
          } else if (metricDefinition.query.table === 'discoveries') {
            // For discoveries, filter by setter_user_id for setters and sales_rep_user_id for reps
            if (accountRole === 'sales_rep') {
              filters.repIds = [profile.id]
            } else if (accountRole === 'setter') {
              filters.setterIds = [profile.id]
            } else if (accountRole === 'admin' || accountRole === 'moderator') {
              filters.setterIds = [profile.id]
              filters.repIds = [profile.id]
            }
          }

          // For non-admin/moderator users or non-appointments metrics, calculate single metric
          if (!['admin', 'moderator'].includes(accountRole) || metricDefinition.query.table !== 'appointments') {
            const request = createMetricRequest(metricName, accountId, dateRange.start, dateRange.end, filters)
            console.log(`Executing metric request for ${profile.full_name} (${accountRole}):`, request)
            const result = await metricsEngine.execute(request)
            
            const value = (result.result.data as any).value || 0
            console.log(`Result for ${profile.full_name}: ${value}`)

            return {
              userId: profile.id,
              name: profile.full_name,
              email: profile.email,
              role: profile.role,
              accountRole: accountRole,
              value: value
            }
          }
        } catch (error) {
          console.error(`Error calculating metric for user ${profile.id}:`, error)
          return {
            userId: profile.id,
            name: profile.full_name,
            email: profile.email,
            role: profile.role,
            accountRole: 'unknown',
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