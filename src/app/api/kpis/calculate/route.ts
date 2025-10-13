import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentPeriod, getAssignedUsers, updateKPIProgress, KPIDefinition } from '@/lib/kpi-calculator'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
  
  try {
    const body = await request.json()
    const { account_id, kpi_id } = body

    // Optional: verify authorization with API key or cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // If cron secret is set, require it
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get active KPIs
    let query = supabase
      .from('kpi_definitions')
      .select('*')
      .eq('is_active', true)

    if (account_id) {
      query = query.eq('account_id', account_id)
    }

    if (kpi_id) {
      query = query.eq('id', kpi_id)
    }

    const { data: kpis, error: kpisError } = await query

    if (kpisError) {
      console.error('Error fetching KPIs:', kpisError)
      return NextResponse.json({ error: 'Failed to fetch KPIs' }, { status: 500 })
    }

    if (!kpis || kpis.length === 0) {
      return NextResponse.json({ message: 'No active KPIs found' })
    }

    const results: any[] = []

    // Process each KPI
    for (const kpi of kpis as KPIDefinition[]) {
      try {
        // Get current period for this KPI
        const { start: periodStart, end: periodEnd } = getCurrentPeriod(
          kpi.period_type,
          kpi.period_days
        )

        if (kpi.applies_to === 'user') {
          // Get assigned users
          const assignedUserIds = await getAssignedUsers(
            supabase,
            kpi.account_id,
            kpi.assigned_user_ids,
            kpi.assigned_roles
          )

          // Calculate for each user
          for (const userId of assignedUserIds) {
            try {
              // Fetch metric value from metrics API
              const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL!.replace('/rest/v1', '')}/api/metrics`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  metricName: kpi.metric_key,
                  filters: {
                    accountId: kpi.account_id,
                    userId: userId,
                    dateRange: {
                      start: periodStart.toISOString().split('T')[0],
                      end: periodEnd.toISOString().split('T')[0]
                    }
                  }
                })
              })

              let currentValue = 0
              if (response.ok) {
                const data = await response.json()
                currentValue = data.result?.data?.value || 0
              }

              // Update progress
              await updateKPIProgress(
                supabase,
                kpi.id,
                userId,
                periodStart,
                periodEnd,
                currentValue,
                kpi.target_value
              )

              results.push({
                kpi_id: kpi.id,
                user_id: userId,
                current_value: currentValue,
                target_value: kpi.target_value
              })
            } catch (error) {
              console.error(`Error calculating KPI for user ${userId}:`, error)
            }
          }
        } else {
          // Account-level KPI
          try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL!.replace('/rest/v1', '')}/api/metrics`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                metricName: kpi.metric_key,
                filters: {
                  accountId: kpi.account_id,
                  dateRange: {
                    start: periodStart.toISOString().split('T')[0],
                    end: periodEnd.toISOString().split('T')[0]
                  }
                }
              })
            })

            let currentValue = 0
            if (response.ok) {
              const data = await response.json()
              currentValue = data.result?.data?.value || 0
            }

            await updateKPIProgress(
              supabase,
              kpi.id,
              null,
              periodStart,
              periodEnd,
              currentValue,
              kpi.target_value
            )

            results.push({
              kpi_id: kpi.id,
              user_id: null,
              current_value: currentValue,
              target_value: kpi.target_value
            })
          } catch (error) {
            console.error(`Error calculating account-level KPI:`, error)
          }
        }
      } catch (error) {
        console.error(`Error processing KPI ${kpi.id}:`, error)
      }
    }

    return NextResponse.json({ 
      message: 'KPI calculation complete',
      processed: results.length,
      results
    })

  } catch (error) {
    console.error('Error in KPI calculate POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

