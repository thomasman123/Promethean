"use client";

import { Sidebar } from '@/components/ui/Sidebar';
import { TopDock } from '@/components/ui/TopDock';
import { Card, StatCard } from '@/components/ui/Card';
import { Button, Badge } from '@/components/ui/Button';

export default function DashboardPage() {
  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Dock */}
        <TopDock />
        
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-8 pb-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard 
              label="Total Revenue"
              value="$124,592"
              change={{ value: '+12.5%', trend: 'up' }}
              icon={
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1.93.66 1.64 2.08 1.64 1.51 0 2.2-.63 2.2-1.51 0-.96-.52-1.46-2.56-1.81-2.25-.38-3.71-1.33-3.71-3.31 0-1.86 1.39-3 3.16-3.33V5h2.67v1.38c1.51.33 2.85 1.28 2.94 3.04h-1.99c-.1-.72-.58-1.38-1.78-1.38-1.21 0-1.94.54-1.94 1.38 0 .83.58 1.26 2.43 1.56 2.5.43 3.84 1.36 3.84 3.53 0 2.03-1.43 3.13-3.36 3.58z"/>
                </svg>
              }
            />
            
            <StatCard 
              label="Appointments"
              value="142"
              change={{ value: '+8.2%', trend: 'up' }}
              icon={
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
                </svg>
              }
            />
            
            <StatCard 
              label="Conversion Rate"
              value="23.8%"
              change={{ value: '-2.4%', trend: 'down' }}
              icon={
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
                </svg>
              }
            />
            
            <StatCard 
              label="Active Users"
              value="89"
              change={{ value: '+5', trend: 'up' }}
              icon={
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                </svg>
              }
            />
          </div>

          {/* Main Content Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-zinc-900">Performance Overview</h3>
                <Badge variant="info">Live</Badge>
              </div>
              <div className="h-64 flex items-center justify-center bg-white rounded-xl">
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

            <Card>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-zinc-900">Revenue Trend</h3>
                <div className="flex gap-2">
                  <Badge>Daily</Badge>
                  <Badge variant="success">+5.3%</Badge>
                </div>
              </div>
              <div className="h-64 flex items-center justify-center bg-white rounded-xl">
                <div className="text-center">
                  <svg className="w-12 h-12 mx-auto mb-3 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z"/>
                  </svg>
                  <p className="text-zinc-500">Chart will be rendered here</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Activity Section */}
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-zinc-900">Recent Activity</h3>
              <Button variant="ghost" size="sm">View All</Button>
            </div>
            
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white rounded-xl">
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
    </div>
  );
} 