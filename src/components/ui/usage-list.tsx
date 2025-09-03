"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface ToolUsage {
  name: string
  jobs: number
  compute: number
  percentage: number
  color: string
}

const toolsData: ToolUsage[] = [
  { name: "Wan", jobs: 2, compute: 573, percentage: 30.7, color: "#8B5CF6" },
  { name: "3D", jobs: 45, compute: 564, percentage: 30.2, color: "#06B6D4" },
  { name: "Kontext", jobs: 4, compute: 254, percentage: 13.6, color: "#EC4899" },
]

export function UsageList() {
  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg font-semibold text-gray-900">Usage by Tool</CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Click to filter</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-gray-500">1/4</span>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {toolsData.map((tool, index) => (
          <div key={tool.name} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: tool.color }}
              />
              <Badge variant="secondary" className="font-medium bg-gray-100 text-gray-700">
                {tool.name}
              </Badge>
            </div>
            
            <div className="flex items-center gap-6 text-sm">
              <div className="text-right">
                <div className="font-medium text-gray-900">Jobs</div>
                <div className="text-gray-500">{tool.jobs}</div>
              </div>
              <div className="text-right">
                <div className="font-medium text-gray-900">Compute</div>
                <div className="text-gray-500">{tool.compute.toLocaleString()}</div>
              </div>
            </div>
          </div>
        ))}
        
        {/* Usage bars */}
        <div className="space-y-3 pt-2">
          {toolsData.map((tool) => (
            <div key={`${tool.name}-bar`} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{tool.name}</span>
                <span className="text-gray-500">{tool.percentage}% of total usage</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
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