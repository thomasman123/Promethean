"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts"

const data = [
  { name: "Wan", value: 30.7, color: "hsl(var(--chart-1))" },
  { name: "3D", value: 30.2, color: "hsl(var(--chart-2))" },
  { name: "Kontext", value: 13.6, color: "hsl(var(--chart-3))" },
  { name: "Flux", value: 10.9, color: "hsl(var(--chart-4))" },
  { name: "Krea I", value: 7.3, color: "hsl(var(--chart-5))" },
  { name: "Enhancer", value: 2.6, color: "hsl(220 13% 69%)" },
]

export function UsageChart() {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Usage Distribution</CardTitle>
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
                  <span className="text-sm text-muted-foreground">
                    {value} ({entry.payload?.value}%)
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="text-center mt-4">
          <div className="text-2xl font-bold text-foreground">1870</div>
          <div className="text-sm text-muted-foreground">Total Compute</div>
        </div>
      </CardContent>
    </Card>
  )
} 