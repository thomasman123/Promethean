"use client"

import { useState, useEffect } from "react"
import { METRICS_REGISTRY } from "@/lib/metrics/registry"
import { useDashboard } from "@/lib/dashboard-context"
import { format } from "date-fns"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

interface DataViewWidgetProps {
  metrics: string[]
  selectedUsers: string[]
  options?: Record<string, Record<string, any>>
}

interface UserMetricData {
  userId: string
  userName: string
  userRole: string
  metricValues: Record<string, number | null>
}

export function DataViewWidget({ metrics, selectedUsers, options }: DataViewWidgetProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<UserMetricData[]>([])
  const { selectedAccountId, dateRange } = useDashboard()

  useEffect(() => {
    if (selectedAccountId && metrics.length > 0 && selectedUsers.length > 0 && dateRange.from && dateRange.to) {
      fetchData()
    }
  }, [selectedAccountId, metrics, selectedUsers, dateRange])

  const fetchData = async () => {
    setLoading(true)
    try {
      // First get user information
      const usersResponse = await fetch(`/api/data-view/users?accountId=${selectedAccountId}`)
      if (!usersResponse.ok) {
        throw new Error(`Failed to fetch users: ${usersResponse.status} ${usersResponse.statusText}`)
      }
      const usersResult = await usersResponse.json()

      const allUsers = usersResult.users || []
      const filteredUsers = allUsers.filter((user: any) => selectedUsers.includes(user.id))

      // Fetch CPA once for the period to keep ROI consistent with the CPA tile
      let cpaValue: number | null = null
      try {
        const cpaReq = {
          metricName: 'cost_per_booked_call',
          filters: {
            accountId: selectedAccountId,
            dateRange: {
              start: format(dateRange.from, 'yyyy-MM-dd'),
              end: format(dateRange.to, 'yyyy-MM-dd')
            }
          },
          options: { vizType: 'kpi' }
        }
        const cpaRes = await fetch('/api/metrics', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cpaReq)
        })
        if (cpaRes.ok) {
          const json = await cpaRes.json()
          if (json?.result?.type === 'total' && json?.result?.data?.value != null) {
            cpaValue = Number(json.result.data.value)
          }
        }
        console.log('  🔢 [DataView] CPA for period:', cpaValue)
      } catch (e) {
        console.log('  ⚠️ [DataView] Failed to fetch CPA for ROI. Will fallback to engine rep_roi.', e)
      }

      // Helper: simple concurrency runner
      async function runWithConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
        const results: T[] = []
        let index = 0
        let active = 0
        return await new Promise<T[]>((resolve, reject) => {
          const next = () => {
            if (index >= tasks.length && active === 0) {
              resolve(results)
              return
            }
            while (active < limit && index < tasks.length) {
              const current = tasks[index++]()
              active++
              current
                .then((res) => { results.push(res) })
                .catch((err) => { reject(err) })
                .finally(() => { active--; next() })
            }
          }
          next()
        })
      }

      type JobResult = { userId: string; metricKey: string; value: number | null }

      // Build jobs for all user+metric pairs
      const jobs: Array<() => Promise<JobResult>> = []

      for (const user of filteredUsers) {
        for (const metricKey of metrics) {
          jobs.push(async () => {
            try {
              // Extract original metric name and attribution from the key
              const metricOptions = options?.[metricKey] || {}
              const originalMetricName = metricOptions.originalMetricName || metricKey
              const attribution = metricOptions.attribution || "assigned"
              
              console.log(`🔍 [DataView] Processing ${originalMetricName} (${attribution}) for user ${user.name} (${user.id}):`)
              
              // Build filters based on user role
              const filters: any = {
                accountId: selectedAccountId,
                dateRange: {
                  start: format(dateRange.from, 'yyyy-MM-dd'),
                  end: format(dateRange.to, 'yyyy-MM-dd')
                }
              }
              
              // Determine table type from metric registry
              const metricDefinition = METRICS_REGISTRY[originalMetricName]
              const tableType = metricDefinition?.query?.table || "appointments"
              
              if (tableType === "discoveries") {
                if (attribution === "assigned") {
                  filters.setterIds = [user.id]
                  console.log(`  - Added setterIds: [${user.id}] (discovery assigned to setter)`)  
                } else if (attribution === "booked") {
                  filters.repIds = [user.id]
                  console.log(`  - Added repIds: [${user.id}] (discovery booked to sales rep)`)
                } else {
                  filters.setterIds = [user.id]
                  console.log(`  - Added setterIds: [${user.id}] (default: discovery assigned)`)
                }
              } else if (tableType === "dials") {
                filters.setterIds = [user.id]
                console.log(`  - Added setterIds: [${user.id}] (dial made by setter)`)
              } else {
                if (attribution === "assigned") {
                  filters.repIds = [user.id]
                  console.log(`  - Added repIds: [${user.id}] (sales rep owned)`)
                } else if (attribution === "booked") {
                  filters.setterIds = [user.id]
                  console.log(`  - Added setterIds: [${user.id}] (setter contributed)`)
                } else {
                  filters.repIds = [user.id]
                  console.log(`  - Added repIds: [${user.id}] (default: sales rep owned)`)
                }
              }
              
              console.log(`  - Final filters:`, filters)
              
              // Map per-user ROI to rep_roi, but if we have CPA fetched, compute ROI locally for perfect consistency
              const requestId = `${user.id}_${metricKey}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
              const requestedMetricName = (originalMetricName === 'roi' && attribution === 'assigned')
                ? 'rep_roi'
                : originalMetricName

              // Determine display override for this metric (used to decide return shape)
              const displayOverride = options?.[metricKey]?.display || (metricKey === 'rep_roi' ? options?.roi?.display : undefined)

              // Local ROI computation path using CPA tile value
              if (requestedMetricName === 'rep_roi' && cpaValue && cpaValue > 0) {
                try {
                  const [cashRes, apptRes] = await Promise.all([
                    fetch('/api/metrics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ metricName: 'cash_collected', filters, options: { vizType: 'kpi' } }) }),
                    fetch('/api/metrics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ metricName: 'total_appointments', filters, options: { vizType: 'kpi' } }) })
                  ])
                  let repCash: number | null = null
                  let repAppts: number | null = null
                  if (cashRes.ok) {
                    const j = await cashRes.json(); repCash = j?.result?.data?.value != null ? Number(j.result.data.value) : null
                  }
                  if (apptRes.ok) {
                    const j2 = await apptRes.json(); repAppts = j2?.result?.data?.value != null ? Number(j2.result.data.value) : null
                  }
                  if (repCash != null && repAppts && repAppts > 0) {
                    const denom = cpaValue * repAppts
                    const multiplier = denom > 0 ? (repCash / denom) : null
                    // If display wants multiplier, return multiplier; else return percent fraction (multiplier - 1)
                    const roiValue = multiplier != null ? (displayOverride === 'multiplier' ? multiplier : (multiplier - 1)) : null
                    console.log(`  ✅ [DataView] Local ROI using CPA ${cpaValue} → cash ${repCash}, appts ${repAppts}, display=${displayOverride || 'percent'} value=${roiValue}`)
                    return { userId: user.id, metricKey, value: roiValue }
                  }
                } catch (e) {
                  console.log('  ⚠️ [DataView] Local ROI compute failed, falling back to engine.', e)
                }
              }

              const requestBody = {
                metricName: requestedMetricName,
                filters,
                options: {
                  vizType: 'kpi',
                  widgetSettings: options?.[metricKey] || {}
                },
                requestId // Include for tracking
              }
              
              console.log(`  - Request body:`, { ...requestBody, requestId })
              
              const response = await fetch('/api/metrics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
              })

              console.log(`  - Response status: ${response.status} [${requestId}]`)
              
              if (response.ok) {
                const metricData = await response.json()
                console.log(`  - Response data [${requestId}]:`, {
                  requestedMetric: requestedMetricName,
                  returnedMetric: metricData.metricName,
                  matches: requestedMetricName === metricData.metricName,
                  executedAt: metricData.executedAt
                })
                
                // Validate response matches request
                if (metricData.metricName !== requestedMetricName) {
                  console.error(`  ❌ METRIC MISMATCH [${requestId}]:`, {
                    requested: requestedMetricName,
                    returned: metricData.metricName,
                    userId: user.id,
                    metricKey
                  })
                  // Don't use mismatched data
                  return { userId: user.id, metricKey, value: null }
                }
                
                let value: number | null = null
                
                if (metricData.result?.type === 'total' && metricData.result.data?.value !== undefined) {
                  value = metricData.result.data.value
                  console.log(`  ✅ Got total value: ${value} [${requestId}]`)
                } else if (metricData.result?.type === 'rep' && Array.isArray(metricData.result.data)) {
                  // Some Postgres JSON keys are lowercased; support common variants
                  const entry = metricData.result.data.find((r: any) => {
                    const repId = r.repId ?? r.repid ?? r.sales_rep_user_id ?? r.salesrepuserid
                    return repId === user.id
                  })
                  if (entry) {
                    const repValue = entry.value ?? entry.Value ?? entry.rep_value ?? entry.repvalue
                    value = typeof repValue === 'number' ? repValue : Number(repValue ?? 0)
                    console.log(`  ✅ Got rep value for ${user.id}: ${value} [${requestId}]`)
                  } else {
                    console.log(`  ❌ No rep entry for ${user.id} [${requestId}]`)
                  }
                } else if (metricData.result?.type === 'time' && Array.isArray(metricData.result.data) && metricData.result.data.length > 0) {
                  if (metricData.result.data.length === 1) {
                    value = metricData.result.data[0].value || metricData.result.data[0].count || 0
                  } else {
                    value = metricData.result.data.reduce((sum: number, item: any) => {
                      return sum + (item.value || item.count || 0)
                    }, 0)
                  }
                  console.log(`  ✅ Got time series value (${metricData.result.data.length} points): ${value} [${requestId}]`)
                } else {
                  console.log(`  ❌ No valid value in response [${requestId}] - result:`, metricData.result)
                }
                
                return { userId: user.id, metricKey, value }
              } else {
                const errorText = await response.text()
                console.error(`  ❌ API error: ${response.status} - ${errorText} [${requestId}]`)
                return { userId: user.id, metricKey, value: null }
              }
            } catch (error) {
              console.error(`❌ Failed to fetch ${metricKey} for user ${user.id}:`, error)
              return { userId: user.id, metricKey, value: null }
            }
          })
        }
      }

      // Execute all jobs with concurrency limit
      const CONCURRENCY = 10
      const results = await runWithConcurrency<JobResult>(jobs, CONCURRENCY)

      // Aggregate results per user
      const userDataMap: Record<string, UserMetricData> = {}
      for (const res of results) {
        if (!userDataMap[res.userId]) {
          userDataMap[res.userId] = {
            userId: res.userId,
            userName: (filteredUsers.find((u: any) => u.id === res.userId)?.name) || res.userId,
            userRole: (filteredUsers.find((u: any) => u.id === res.userId)?.role) || 'unknown',
            metricValues: {}
          }
        }
        userDataMap[res.userId].metricValues[res.metricKey] = res.value
      }

      setData(Object.values(userDataMap))
    } finally {
      setLoading(false)
    }
  }

  const formatValue = (value: number | null, metricName: string): string => {
    if (value === null || value === undefined) return '--'
    
    const metricInfo = METRICS_REGISTRY[metricName]
    if (!metricInfo) return value.toString()

    // Respect display override for ROI metrics
    // If display is multiplier and unit is percent (fraction), render as X.x×
    const displayOverride = options?.[metricName]?.display || (metricName === 'rep_roi' ? options?.roi?.display : undefined)
    if (displayOverride === 'multiplier') {
      // If upstream returned multiplier already, just append x; if it returned percent (fraction), convert by adding 1
      const multiple = metricInfo.unit === 'percent' ? ((value ?? 0) + 1) : (value ?? 0)
      return `${multiple.toFixed(2)}x`
    }

    // Handle time-based metrics with special formatting
    if (metricInfo.unit === 'seconds' && metricInfo.name.toLowerCase().includes('speed')) {
      if (value < 60) {
        return `${value.toFixed(0)}s`
      } else if (value < 3600) {
        return `${(value / 60).toFixed(1)}m`
      } else {
        return `${(value / 3600).toFixed(1)}h`
      }
    }

    switch (metricInfo.unit) {
      case 'currency':
        return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
      case 'percent':
        return `${(value * 100).toFixed(1)}%`
      case 'seconds':
        if (value < 60) {
          return `${value.toFixed(0)}s`
        } else if (value < 3600) {
          return `${(value / 60).toFixed(1)}m`
        } else {
          return `${(value / 3600).toFixed(1)}h`
        }
      case 'days':
        return `${value.toFixed(1)}d`
      case 'count':
        // For count unit on ROI multiplier metrics, show as multiplier
        if (metricInfo.name?.includes('ROI') && metricInfo.name?.includes('Multiplier')) {
          return `${value.toFixed(2)}x`
        }
        return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
      default:
        return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    }
  }

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'destructive'
      case 'moderator':
        return 'secondary'
      case 'sales_rep':
      case 'rep':
        return 'default'
      case 'setter':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  if (loading) {
    return (
      <div className="h-full space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          {Array.from({ length: Math.min(selectedUsers.length, 5) }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>No data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">User</TableHead>
            <TableHead className="w-[100px]">Role</TableHead>
            {metrics.map(metricKey => {
              const metricOptions = options?.[metricKey] || {}
              const originalMetricName = metricOptions.originalMetricName || metricKey
              const attribution = metricOptions.attribution || "assigned"
              const metricDisplayName = METRICS_REGISTRY[originalMetricName]?.name || originalMetricName
              
              // Get attribution label based on table type
              const metricDefinition = METRICS_REGISTRY[originalMetricName]
              const tableType = metricDefinition?.query?.table || "appointments"
              
              // For dials metrics, don't show attribution since there's only setter_user_id
              if (tableType === "dials") {
                return (
                  <TableHead key={metricKey} className="text-right">
                    {metricDisplayName}
                  </TableHead>
                )
              }
              
              // For other metrics, show attribution
              let attributionLabel = attribution
              if (attribution === "assigned") {
                attributionLabel = tableType === "discoveries" ? "Setter Attribution" : "Sales Rep Attribution"
              } else if (attribution === "booked") {
                attributionLabel = tableType === "discoveries" ? "Sales Rep Attribution" : "Setter Attribution"
              } else if (attribution === "all") {
                attributionLabel = "All Attribution"
              }
              
              return (
                <TableHead key={metricKey} className="text-right">
                  <div className="text-right">
                    <div className="font-medium">{metricDisplayName}</div>
                    <div className="text-xs text-muted-foreground">({attributionLabel})</div>
                  </div>
                </TableHead>
              )
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((user) => (
            <TableRow key={user.userId}>
              <TableCell className="font-medium">{user.userName}</TableCell>
              <TableCell>
                <Badge variant={getRoleColor(user.userRole)} className="text-xs">
                  {user.userRole}
                </Badge>
              </TableCell>
              {metrics.map(metricKey => {
                const metricOptions = options?.[metricKey] || {}
                const originalMetricName = metricOptions.originalMetricName || metricKey
                
                return (
                  <TableCell key={metricKey} className="text-right">
                    {formatValue(user.metricValues[metricKey], originalMetricName)}
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
} 