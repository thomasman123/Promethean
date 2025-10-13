"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Target, TrendingUp, AlertCircle, CheckCircle2, Clock } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"
import { Database } from "@/lib/database.types"
import { useDashboard } from "@/lib/dashboard-context"
import { useEffectiveUser } from "@/hooks/use-effective-user"

interface KPIProgress {
  id: string
  kpi_definition_id: string
  user_id: string | null
  period_start: string
  period_end: string
  current_value: number
  target_value: number
  progress_percentage: number
  status: 'on_track' | 'at_risk' | 'behind' | 'exceeded'
  kpi_definition: {
    id: string
    name: string
    description?: string
    metric_key: string
    target_type: string
    period_type: string
  }
}

interface KPIProgressWidgetProps {
  options?: {
    showCount?: number // Number of KPIs to show
    compact?: boolean // Compact mode for smaller widgets
  }
}

export function KPIProgressWidget({ options }: KPIProgressWidgetProps) {
  const [progress, setProgress] = useState<KPIProgress[]>([])
  const [loading, setLoading] = useState(true)
  
  const { selectedAccountId } = useDashboard()
  const { user: effectiveUser } = useEffectiveUser()
  
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const showCount = options?.showCount || 5
  const compact = options?.compact || false

  useEffect(() => {
    if (effectiveUser && selectedAccountId) {
      fetchProgress()
      // Refresh every 5 minutes
      const interval = setInterval(fetchProgress, 5 * 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [effectiveUser, selectedAccountId])

  const fetchProgress = async () => {
    if (!effectiveUser || !selectedAccountId) return
    
    try {
      const response = await fetch(`/api/kpis/progress?account_id=${selectedAccountId}&user_id=${effectiveUser.id}`)
      const data = await response.json()
      
      if (response.ok) {
        setProgress((data.progress || []).slice(0, showCount))
      }
    } catch (error) {
      console.error('Error fetching KPI progress:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track':
        return 'bg-green-500'
      case 'at_risk':
        return 'bg-yellow-500'
      case 'behind':
        return 'bg-red-500'
      case 'exceeded':
        return 'bg-blue-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on_track':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'at_risk':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'behind':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'exceeded':
        return <TrendingUp className="h-4 w-4 text-blue-500" />
      default:
        return <Target className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'on_track':
        return 'On Track'
      case 'at_risk':
        return 'At Risk'
      case 'behind':
        return 'Behind'
      case 'exceeded':
        return 'Exceeded'
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading KPIs...</p>
        </div>
      </div>
    )
  }

  if (progress.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center p-6">
          <Target className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-sm text-muted-foreground">No active KPIs</p>
          <p className="text-xs text-muted-foreground mt-1">
            Ask your admin to set up KPIs
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-2">
      <div className={compact ? "space-y-2" : "space-y-4"}>
        {progress.map((kpi) => (
          <Card key={kpi.id} className={compact ? "p-3" : "p-4"}>
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getStatusIcon(kpi.status)}
                  <h4 className={`font-semibold truncate ${compact ? 'text-sm' : 'text-base'}`}>
                    {kpi.kpi_definition.name}
                  </h4>
                </div>
                {!compact && (
                  <Badge 
                    variant="outline" 
                    className={`${getStatusColor(kpi.status)} text-white border-0 whitespace-nowrap`}
                  >
                    {getStatusText(kpi.status)}
                  </Badge>
                )}
              </div>
              
              {!compact && kpi.kpi_definition.description && (
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {kpi.kpi_definition.description}
                </p>
              )}
              
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>
                    {kpi.current_value.toLocaleString()} / {kpi.target_value.toLocaleString()}
                  </span>
                  <span className="font-medium">
                    {Math.round(kpi.progress_percentage)}%
                  </span>
                </div>
                <Progress 
                  value={Math.min(kpi.progress_percentage, 100)} 
                  className="h-2"
                />
              </div>
              
              {!compact && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="capitalize">
                    {kpi.kpi_definition.period_type} goal
                  </span>
                  <span>
                    {new Date(kpi.period_start).toLocaleDateString()} - {new Date(kpi.period_end).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
      
      {progress.length > 0 && (
        <div className="mt-4 text-center">
          <a 
            href="/account/kpis" 
            className="text-xs text-primary hover:underline"
          >
            View all KPIs →
          </a>
        </div>
      )}
    </div>
  )
}

