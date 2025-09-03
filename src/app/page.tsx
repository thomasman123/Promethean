"use client"

import { Sidebar } from "@/components/layout/sidebar"
import { TopBar } from "@/components/layout/topbar"
import { StatsCard } from "@/components/ui/stats-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, Cpu, Wrench, Calendar } from "lucide-react"

export default function HomePage() {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <TopBar />
        
        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Page header */}
            <div>
              <h1 className="text-2xl font-bold">Usage Statistics</h1>
              <p className="text-muted-foreground">
                View your personal usage statistics and compute consumption across different tools and time periods.
              </p>
            </div>
            
            {/* Date selector */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <select className="rounded-md border bg-background px-3 py-1 text-sm">
                <option>Last 7 days</option>
                <option>Last 30 days</option>
                <option>Last 90 days</option>
              </select>
            </div>
            
            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatsCard
                title="Total Jobs"
                value="148"
                icon={<BarChart3 className="h-4 w-4" />}
              />
              <StatsCard
                title="Compute Units"
                value="1,870"
                icon={<Cpu className="h-4 w-4" />}
              />
              <StatsCard
                title="Tools Used"
                value="12"
                icon={<Wrench className="h-4 w-4" />}
              />
            </div>
            
            {/* Usage Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Usage Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center h-64">
                    {/* Placeholder for pie chart */}
                    <div className="text-center">
                      <div className="text-3xl font-bold">1870</div>
                      <div className="text-sm text-muted-foreground">Total Compute</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Usage by Tool</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { name: "Wan", jobs: 2, compute: 573, percentage: 30.7 },
                      { name: "3D", jobs: 45, compute: 564, percentage: 30.2 },
                      { name: "Kontext", jobs: 4, compute: 254, percentage: 13.6 },
                    ].map((tool) => (
                      <div key={tool.name} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{tool.name}</span>
                          <span className="text-muted-foreground">
                            {tool.jobs} jobs • {tool.compute} compute
                          </span>
                        </div>
                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${tool.percentage}%` }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {tool.percentage}% of total usage
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
} 