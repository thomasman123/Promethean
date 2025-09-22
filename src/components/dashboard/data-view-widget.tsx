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
        
        for (const metricName of metrics) {
          try {
            // Determine if user is a setter or rep based on their role
            const isRep = ['sales_rep', 'moderator', 'admin', 'rep'].includes(user.role.toLowerCase())
            const isSetter = user.role.toLowerCase() === 'setter'
            
            console.log(`🔍 [DataView] Processing ${metricName} for user ${user.name} (${user.id}):`)
            console.log(`  - Role: ${user.role} (isRep: ${isRep}, isSetter: ${isSetter})`)
            
            // Build filters based on user role
            const filters: any = {
              accountId: selectedAccountId,
              dateRange: {
                start: format(dateRange.from, 'yyyy-MM-dd'),
                end: format(dateRange.to, 'yyyy-MM-dd')
              }
            }
            
            // Add user-specific filtering based on their role
            if (isRep) {
              filters.repIds = [user.id]
              console.log(`  - Added repIds: [${user.id}]`)
            }
            if (isSetter) {
              filters.setterIds = [user.id]
              console.log(`  - Added setterIds: [${user.id}]`)
            }
            
            console.log(`  - Final filters:`, filters)
            
            const requestBody = {
              metricName,
              filters,
              options: {
                vizType: 'data',
                widgetSettings: options?.[metricName] || {}
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
              
              if (metricData.result?.type === 'total' && metricData.result.data?.value !== undefined) {
                userMetricValues[metricName] = metricData.result.data.value
                console.log(`  ✅ Got value: ${metricData.result.data.value}`)
              } else {
                userMetricValues[metricName] = null
                console.log(`  ❌ No valid value in response - result:`, metricData.result)
              }
            } else {
              const errorText = await response.text()
              console.error(`  ❌ API error: ${response.status} - ${errorText}`)
              userMetricValues[metricName] = null
            }
          } catch (error) {
            console.error(`❌ Failed to fetch ${metricName} for user ${user.id}:`, error)
            userMetricValues[metricName] = null
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
            {metrics.map(metricName => (
              <TableHead key={metricName} className="text-right">
                {METRICS_REGISTRY[metricName]?.name || metricName}
              </TableHead>
            ))}
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
              {metrics.map(metricName => (
                <TableCell key={metricName} className="text-right">
                  {formatValue(user.metricValues[metricName], metricName)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
} 