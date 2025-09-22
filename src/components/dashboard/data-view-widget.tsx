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
      const usersResult = await usersResponse.json()
      
      if (!usersResponse.ok) {
        throw new Error('Failed to fetch users')
      }

      const allUsers = usersResult.users || []
      const filteredUsers = allUsers.filter((user: any) => selectedUsers.includes(user.id))

      // Fetch metric data for each user and metric combination
      const userData: UserMetricData[] = []
      
      for (const user of filteredUsers) {
        const userMetricValues: Record<string, number | null> = {}
        
        for (const metricKey of metrics) {
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
              // For discoveries: assigned = setter_user_id, booked = sales_rep_user_id (only if discovery was booked)
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
              // For dials: both assigned and dialer use setter_user_id (dials don't have sales_rep_user_id)
              filters.setterIds = [user.id]
              console.log(`  - Added setterIds: [${user.id}] (dial made by setter)`)
            } else {
              // For appointments and other tables: assigned = sales_rep_user_id, booked = setter_user_id
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
            
            const requestBody = {
              metricName: originalMetricName,
              filters,
              options: {
                vizType: 'kpi', // Use KPI viz type to get total values instead of time series
                widgetSettings: options?.[metricKey] || {}
              }
            }
            
            console.log(`  - Request body:`, requestBody)
            
            const response = await fetch('/api/metrics', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestBody)
            })

            console.log(`  - Response status: ${response.status}`)
            
            if (response.ok) {
              const metricData = await response.json()
              console.log(`  - Response data:`, metricData)
              
              // Handle different response formats
              let value = null
              
              if (metricData.result?.type === 'total' && metricData.result.data?.value !== undefined) {
                // Standard total response format
                value = metricData.result.data.value
                console.log(`  ✅ Got total value: ${value}`)
              } else if (metricData.result?.type === 'time' && Array.isArray(metricData.result.data) && metricData.result.data.length > 0) {
                // Time series response - sum all values or take the first/last value
                if (metricData.result.data.length === 1) {
                  value = metricData.result.data[0].value || metricData.result.data[0].count || 0
                } else {
                  // Sum all time series values for total
                  value = metricData.result.data.reduce((sum: number, item: any) => {
                    return sum + (item.value || item.count || 0)
                  }, 0)
                }
                console.log(`  ✅ Got time series value (${metricData.result.data.length} points): ${value}`)
              } else {
                console.log(`  ❌ No valid value in response - result:`, metricData.result)
              }
              
              userMetricValues[metricKey] = value
            } else {
              const errorText = await response.text()
              console.error(`  ❌ API error: ${response.status} - ${errorText}`)
              userMetricValues[metricKey] = null
            }
          } catch (error) {
            console.error(`❌ Failed to fetch ${metricKey} for user ${user.id}:`, error)
            userMetricValues[metricKey] = null
          }
        }

        userData.push({
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          metricValues: userMetricValues
        })
      }

      setData(userData)
    } catch (error) {
      console.error('Failed to fetch data view data:', error)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  const formatValue = (value: number | null, metricName: string): string => {
    if (value === null || value === undefined) return '--'
    
    const metricInfo = METRICS_REGISTRY[metricName]
    if (!metricInfo) return value.toString()

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
              let attributionLabel = attribution
              
              if (attribution === "assigned") {
                attributionLabel = tableType === "discoveries" ? "Assigned to Setter" : 
                                 tableType === "dials" ? "Dialer" : "Sales Rep Owned"
              } else if (attribution === "booked") {
                attributionLabel = tableType === "discoveries" ? "Booked to Sales Rep" : "Setter Contributed"
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