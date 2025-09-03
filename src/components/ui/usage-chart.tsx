"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts"

const data = [
  { name: "Wan", value: 30.7, color: "#8B5CF6" },
  { name: "3D", value: 30.2, color: "#06B6D4" },
  { name: "Kontext", value: 13.6, color: "#EC4899" },
  { name: "Flux", value: 10.9, color: "#10B981" },
  { name: "Krea I", value: 7.3, color: "#F59E0B" },
  { name: "Enhancer", value: 2.6, color: "#6B7280" },
]

export function UsageChart() {
  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">Usage Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value, entry) => (
                  <span className="text-sm text-gray-600">
                    {value} ({entry.payload?.value}%)
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="text-center mt-4">
          <div className="text-2xl font-bold text-gray-900">1870</div>
          <div className="text-sm text-gray-500">Total Compute</div>
        </div>
      </CardContent>
    </Card>
  )
} 