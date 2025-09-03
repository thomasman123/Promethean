"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Filter } from "lucide-react"

interface ToolUsage {
  name: string
  jobs: number
  compute: number
  percentage: number
  color: string
}

const toolsData: ToolUsage[] = [
  { name: "Wan", jobs: 2, compute: 573, percentage: 30.7, color: "hsl(var(--chart-1))" },
  { name: "3D", jobs: 45, compute: 564, percentage: 30.2, color: "hsl(var(--chart-2))" },
  { name: "Kontext", jobs: 4, compute: 254, percentage: 13.6, color: "hsl(var(--chart-3))" },
]

export function UsageList() {
  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Usage by Tool</CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Click to filter</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground">1/4</span>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {toolsData.map((tool, index) => (
          <div key={tool.name} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: tool.color }}
              />
              <Badge variant="secondary" className="font-medium">
                {tool.name}
              </Badge>
            </div>
            
            <div className="flex items-center gap-6 text-sm">
              <div className="text-right">
                <div className="font-medium">Jobs</div>
                <div className="text-muted-foreground">{tool.jobs}</div>
              </div>
              <div className="text-right">
                <div className="font-medium">Compute</div>
                <div className="text-muted-foreground">{tool.compute.toLocaleString()}</div>
              </div>
            </div>
          </div>
        ))}
        
        {/* Usage bars */}
        <div className="space-y-3 pt-2">
          {toolsData.map((tool) => (
            <div key={`${tool.name}-bar`} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{tool.name}</span>
                <span className="text-muted-foreground">{tool.percentage}% of total usage</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="h-2 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${tool.percentage}%`,
                    backgroundColor: tool.color
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
} 