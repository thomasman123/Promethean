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
    console.log('Account access data:', accountAccess)
    console.log('Account access map:', Object.fromEntries(accountRoleMap))

    // Calculate metrics for each user
    const userMetrics = await Promise.all(
      profiles.map(async (profile) => {
        try {
          const accountRole = accountRoleMap.get(profile.id) || profile.role
          const foundInMap = accountRoleMap.has(profile.id)
          console.log(`Calculating metrics for user: ${profile.full_name} (${profile.email}) - Profile Role: ${profile.role}, Account Role: ${accountRole}, Found in map: ${foundInMap}`)
          
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
            } else if (accountRole === 'setter') {
              filters.setterIds = [profile.id]
              console.log(`Appointments: filtering by setterIds for ${profile.full_name} (setter)`)
            } else if (accountRole === 'admin' || accountRole === 'moderator') {
              // For admin/moderator users, check if they have any data first
              const hasDataRequest = createMetricRequest(metricName, accountId, dateRange.start, dateRange.end, {
                setterIds: [profile.id]
              })
              const hasDataRepRequest = createMetricRequest(metricName, accountId, dateRange.start, dateRange.end, {
                repIds: [profile.id]
              })

              const [setterResult, repResult] = await Promise.all([
                metricsEngine.execute(hasDataRequest),
                metricsEngine.execute(hasDataRepRequest)
              ])

              // Get individual values
              const setterValue = (setterResult.result.data as any).value || 0
              const repValue = (repResult.result.data as any).value || 0

              // Only include admin/moderator if they have data
              if (setterValue === 0 && repValue === 0) {
                return null // Will be filtered out
              }

              // Combine results based on metric type
              let combinedValue = 0
              if (metricDefinition.unit === 'count' || metricDefinition.unit === 'currency') {
                // For counts and currency, add them together
                combinedValue = setterValue + repValue
              } else if (metricDefinition.unit === 'percent') {
                // For percentages, we need to recalculate based on combined data
                combinedValue = Math.max(setterValue, repValue)
              } else {
                // For other units, take the maximum or average
                combinedValue = (setterValue + repValue) / 2
              }

              console.log(`Admin/Moderator user ${profile.full_name} - Setter: ${setterValue}, Rep: ${repValue}, Combined: ${combinedValue}`)

              return {
                userId: profile.id,
                name: profile.full_name,
                email: profile.email,
                role: profile.role,
                accountRole: accountRole,
                value: combinedValue,
                rawSetterValue: setterValue,
                rawRepValue: repValue,
                displayValue: `${combinedValue} (${setterValue} setter + ${repValue} rep)`
              }
            }
          } else if (metricDefinition.query.table === 'dials') {
            // For dials, filter by setter_user_id
            if (accountRole === 'setter') {
              filters.setterIds = [profile.id]
            } else if (accountRole === 'admin' || accountRole === 'moderator') {
              // Check if admin/moderator has dial data
              filters.setterIds = [profile.id]
              const request = createMetricRequest(metricName, accountId, dateRange.start, dateRange.end, filters)
              const result = await metricsEngine.execute(request)
              const value = (result.result.data as any).value || 0
              
              if (value === 0) {
                return null // Will be filtered out
              }
              
              return {
                userId: profile.id,
                name: profile.full_name,
                email: profile.email,
                role: profile.role,
                accountRole: accountRole,
                value: value,
                displayValue: `${value} (setter)`
              }
            }
          } else if (metricDefinition.query.table === 'discoveries') {
            // For discoveries, filter by setter_user_id for setters and sales_rep_user_id for reps
            if (accountRole === 'sales_rep') {
              filters.repIds = [profile.id]
            } else if (accountRole === 'setter') {
              filters.setterIds = [profile.id]
            } else if (accountRole === 'admin' || accountRole === 'moderator') {
              // Check if admin/moderator has discovery data
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

              const setterValue = (setterResult.result.data as any).value || 0
              const repValue = (repResult.result.data as any).value || 0

              if (setterValue === 0 && repValue === 0) {
                return null // Will be filtered out
              }

              const combinedValue = setterValue + repValue
              return {
                userId: profile.id,
                name: profile.full_name,
                email: profile.email,
                role: profile.role,
                accountRole: accountRole,
                value: combinedValue,
                rawSetterValue: setterValue,
                rawRepValue: repValue,
                displayValue: `${combinedValue} (${setterValue} setter + ${repValue} rep)`
              }
            }
          }

          // For non-admin/moderator users, calculate single metric
          if (!['admin', 'moderator'].includes(accountRole)) {
            const request = createMetricRequest(metricName, accountId, dateRange.start, dateRange.end, {
              repIds: filters.repIds,
              setterIds: filters.setterIds
            })
            console.log(`Executing metric request for ${profile.full_name} (${accountRole}):`, request)
            const result = await metricsEngine.execute(request)
            
            const value = (result.result.data as any).value || 0
            console.log(`Result for ${profile.full_name}: ${value}`)

            // Create display value with role label for appointments
            let displayValue = value.toString()
            if (metricDefinition.query.table === 'appointments') {
              if (accountRole === 'sales_rep') {
                displayValue = `${value} (rep)`
              } else if (accountRole === 'setter') {
                displayValue = `${value} (setter)`
              }
            }

            return {
              userId: profile.id,
              name: profile.full_name,
              email: profile.email,
              role: profile.role,
              accountRole: accountRole,
              value: value,
              displayValue: displayValue
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

    // Filter out null results (admin/moderator users with no data)
    const filteredUserMetrics = userMetrics.filter(metric => metric !== null)

    return NextResponse.json({
      metricName,
      metricDefinition: {
        name: metricDefinition.name,
        description: metricDefinition.description,
        unit: metricDefinition.unit
      },
      dateRange,
      accountId,
      userMetrics: filteredUserMetrics
    })

  } catch (error) {
    console.error('Error in user-metrics API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 