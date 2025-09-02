"use client";

import { SidebarNav } from "@/components/ui/sidebar-nav";
import { TopBar } from "@/components/ui/top-bar";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function TestDesignPage() {
  return (
    <div className="h-screen flex bg-dashboard-bg">
      {/* Sidebar */}
      <SidebarNav />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <TopBar />
        
        {/* Main Content Area */}
        <main className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-foreground mb-6">
              Navigation Components Test
            </h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* KPI Card inspired by first image */}
              <div className="widget-bg border border-widget-border rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Total Revenue</h3>
                  <Badge variant="outline" className="text-xs">90 days</Badge>
                </div>
                <div className="text-2xl font-bold text-foreground mb-2">$24,000</div>
                <div className="text-sm text-kpi-accent font-medium">+12.5% from last period</div>
                
                {/* Simple chart placeholder */}
                <div className="mt-4 h-12 bg-gradient-to-r from-chart-1/20 to-chart-2/20 rounded flex items-end justify-center space-x-1">
                  {[...Array(8)].map((_, i) => (
                    <div 
                      key={i} 
                      className="bg-chart-1 rounded-sm" 
                      style={{ 
                        height: `${Math.random() * 40 + 10}px`, 
                        width: '8px' 
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Additional KPI Cards */}
              <div className="widget-bg border border-widget-border rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Appointments</h3>
                  <Badge variant="outline" className="text-xs">90 days</Badge>
                </div>
                <div className="text-2xl font-bold text-foreground mb-2">142</div>
                <div className="text-sm text-chart-2 font-medium">+8.2% from last period</div>
              </div>

              <div className="widget-bg border border-widget-border rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Close Rate</h3>
                  <Badge variant="outline" className="text-xs">90 days</Badge>
                </div>
                <div className="text-2xl font-bold text-foreground mb-2">89.5%</div>
                <div className="text-sm text-chart-3 font-medium">+2.1% from last period</div>
              </div>

              <div className="widget-bg border border-widget-border rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Active Users</h3>
                  <Badge variant="outline" className="text-xs">90 days</Badge>
                </div>
                <div className="text-2xl font-bold text-foreground mb-2">1,234</div>
                <div className="text-sm text-chart-4 font-medium">+15.3% from last period</div>
              </div>
            </div>

            {/* Data Table Preview inspired by second image */}
            <div className="widget-bg border border-widget-border rounded-lg shadow-sm">
              <div className="p-6 border-b border-widget-border">
                <h2 className="text-lg font-semibold text-foreground">Team Performance</h2>
                <p className="text-sm text-muted-foreground mt-1">Overview of team member metrics</p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Name</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Calls</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Appointments</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Close Rate</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Revenue</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: "John Doe", calls: 145, appointments: 23, closeRate: "15.9%", revenue: "$12.5K", status: "Active" },
                      { name: "Jane Smith", calls: 132, appointments: 19, closeRate: "14.4%", revenue: "$9.8K", status: "Active" },
                      { name: "Bob Johnson", calls: 128, appointments: 21, closeRate: "16.4%", revenue: "$11.2K", status: "Active" },
                      { name: "Sarah Wilson", calls: 156, appointments: 28, closeRate: "17.9%", revenue: "$15.1K", status: "Active" },
                    ].map((member, index) => (
                      <tr key={index} className="border-b border-widget-border hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-foreground">{member.name}</span>
                          </div>
                        </td>
                        <td className="p-4 text-foreground">{member.calls}</td>
                        <td className="p-4 text-foreground">{member.appointments}</td>
                        <td className="p-4">
                          <span className="text-chart-2 font-medium">{member.closeRate}</span>
                        </td>
                        <td className="p-4 font-medium text-foreground">{member.revenue}</td>
                        <td className="p-4">
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {member.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 