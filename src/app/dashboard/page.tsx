"use client";

import { Sidebar } from '@/components/ui/Sidebar';
import { TopDock } from '@/components/ui/TopDock';
import { Card, KPIWidget } from '@/components/ui/Card';
import { Button, Badge } from '@/components/ui/Button';

export default function DashboardPage() {
  return (
    <>
      {/* Floating Sidebar */}
      <Sidebar />
      
      {/* Top Dock */}
      <TopDock />
      
      {/* Full-width Content */}
      <div className="min-h-screen bg-white">
        {/* Content Area - Dashboard Overview */}
        <div className="px-8 pt-20 pb-8">
          {/* KPI Widgets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <KPIWidget 
              label="Total Revenue"
              value="$124,592"
              change={{ value: '12.5%', trend: 'up' }}
            />
            
            <KPIWidget 
              label="Appointments"
              value="142"
              change={{ value: '8.2%', trend: 'up' }}
            />
            
            <KPIWidget 
              label="Conversion Rate"
              value="23.8%"
              change={{ value: '2.4%', trend: 'down' }}
            />
            
            <KPIWidget 
              label="Active Users"
              value="89"
              change={{ value: '5', trend: 'up' }}
            />
          </div>

          {/* Chart Widgets */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Performance Overview */}
            <Card padding="md">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-zinc-900">Performance Overview</h3>
                <Badge variant="info">Live</Badge>
              </div>
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-12 h-12 mx-auto mb-3 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="13" width="4" height="7" />
                    <rect x="10" y="9" width="4" height="11" />
                    <rect x="17" y="5" width="4" height="15" />
                  </svg>
                  <p className="text-zinc-500">Chart will be rendered here</p>
                </div>
              </div>
            </Card>

            {/* Revenue Trend */}
            <Card padding="md">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-zinc-900">Revenue Trend</h3>
                <div className="flex gap-2">
                  <Badge>Daily</Badge>
                  <Badge variant="success">+5.3%</Badge>
                </div>
              </div>
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-12 h-12 mx-auto mb-3 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z"/>
                  </svg>
                  <p className="text-zinc-500">Chart will be rendered here</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Activity Widget */}
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-zinc-900">Recent Activity</h3>
              <Button variant="ghost" size="sm">View All</Button>
            </div>
            
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-zinc-200 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-zinc-900" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-zinc-900">New appointment booked</p>
                      <p className="text-sm text-zinc-500">John Doe scheduled for tomorrow</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-zinc-500">2 hours ago</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
} 