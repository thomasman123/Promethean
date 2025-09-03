import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { MetricCard } from "@/components/ui/metric-card"
import { UsageChart } from "@/components/ui/usage-chart"
import { UsageList } from "@/components/ui/usage-list"
import { BarChart3, Zap, Wrench } from "lucide-react"

export default function Home() {
  return (
    <DashboardLayout title="Usage Statistics">
      <div className="space-y-6">
        {/* Top metrics row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard 
            title="Total Jobs" 
            value={148}
            icon={<BarChart3 className="w-4 h-4" />}
          />
          <MetricCard 
            title="Compute Units" 
            value="1,870"
            icon={<Zap className="w-4 h-4" />}
          />
          <MetricCard 
            title="Tools Used" 
            value={12}
            icon={<Wrench className="w-4 h-4" />}
          />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <UsageChart />
          <UsageList />
        </div>

        {/* Description */}
        <div className="text-center py-8">
          <p className="text-muted-foreground max-w-2xl mx-auto">
            View your personal usage statistics and compute consumption across different tools and time periods.
            This design matches your preferred aesthetic with pill navigation, clean cards, and seamless background integration.
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
} 