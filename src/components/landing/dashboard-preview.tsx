'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { NumberTicker } from '@/components/ui/number-ticker'
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp, DollarSign, Phone, Users, Calendar, Target } from 'lucide-react'

// Sample data for the charts
const weeklyData = [
  { name: 'Mon', appointments: 45, showUps: 32, sales: 18, revenue: 12400 },
  { name: 'Tue', appointments: 52, showUps: 38, sales: 22, revenue: 15800 },
  { name: 'Wed', appointments: 48, showUps: 35, sales: 20, revenue: 14200 },
  { name: 'Thu', appointments: 58, showUps: 42, sales: 25, revenue: 18500 },
  { name: 'Fri', appointments: 55, showUps: 40, sales: 24, revenue: 17100 },
  { name: 'Sat', appointments: 38, showUps: 28, sales: 16, revenue: 11200 },
  { name: 'Sun', appointments: 32, showUps: 24, sales: 14, revenue: 9800 },
]

const performanceData = [
  { name: 'Week 1', roi: 6.2, conversionRate: 0.58 },
  { name: 'Week 2', roi: 7.1, conversionRate: 0.62 },
  { name: 'Week 3', roi: 7.8, conversionRate: 0.65 },
  { name: 'Week 4', roi: 8.4, conversionRate: 0.68 },
]

export function DashboardPreview() {
  const [activeChart, setActiveChart] = useState<'bar' | 'line' | 'area'>('bar')

  const renderChart = () => {
    const commonProps = {
      data: weeklyData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    }

    switch (activeChart) {
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="name" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Bar dataKey="appointments" fill="hsl(var(--chart-1))" name="Appointments" radius={[4, 4, 0, 0]} />
            <Bar dataKey="showUps" fill="hsl(var(--chart-2))" name="Show Ups" radius={[4, 4, 0, 0]} />
            <Bar dataKey="sales" fill="hsl(var(--chart-3))" name="Sales" radius={[4, 4, 0, 0]} />
          </BarChart>
        )
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="name" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Line type="monotone" dataKey="appointments" stroke="hsl(var(--chart-1))" name="Appointments" strokeWidth={2} />
            <Line type="monotone" dataKey="showUps" stroke="hsl(var(--chart-2))" name="Show Ups" strokeWidth={2} />
            <Line type="monotone" dataKey="sales" stroke="hsl(var(--chart-3))" name="Sales" strokeWidth={2} />
          </LineChart>
        )
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="name" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Area type="monotone" dataKey="appointments" stackId="1" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.6} name="Appointments" />
            <Area type="monotone" dataKey="showUps" stackId="1" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.6} name="Show Ups" />
            <Area type="monotone" dataKey="sales" stackId="1" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.6} name="Sales" />
          </AreaChart>
        )
    }
  }

  return (
    <div className="w-full">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Appointments
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <NumberTicker value={328} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-green-600">↑ 12.5%</span>
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Show Ups
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <NumberTicker value={239} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-green-600">↑ 8.3%</span>
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Sales Made
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <NumberTicker value={139} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-green-600">↑ 15.2%</span>
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Show Up Rate
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <NumberTicker value={72.9} decimalPlaces={1} />%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-green-600">↑ 3.4%</span>
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Cash Collected
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $<NumberTicker value={99} />K
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-green-600">↑ 18.7%</span>
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                ROI
              </CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <NumberTicker value={8.4} decimalPlaces={1} />x
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-green-600">↑ 1.2x</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Chart */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Weekly Performance</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Interactive sales funnel metrics
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={activeChart === 'bar' ? 'default' : 'outline'}
                onClick={() => setActiveChart('bar')}
              >
                Bar
              </Button>
              <Button
                size="sm"
                variant={activeChart === 'line' ? 'default' : 'outline'}
                onClick={() => setActiveChart('line')}
              >
                Line
              </Button>
              <Button
                size="sm"
                variant={activeChart === 'area' ? 'default' : 'outline'}
                onClick={() => setActiveChart('area')}
              >
                Area
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Additional Metrics Row */}
      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>ROI Trend</CardTitle>
            <p className="text-sm text-muted-foreground">
              Return on investment over time
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: any) => [`${value}x`, 'ROI']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="roi" 
                    stroke="hsl(var(--chart-1))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--chart-1))', r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Conversion Rate</CardTitle>
            <p className="text-sm text-muted-foreground">
              Appointment to sale conversion
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: any) => [`${(value * 100).toFixed(1)}%`, 'Conversion']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="conversionRate" 
                    stroke="hsl(var(--chart-2))" 
                    fill="hsl(var(--chart-2))"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

