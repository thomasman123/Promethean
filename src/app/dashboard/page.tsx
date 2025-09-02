"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardStore } from "@/lib/dashboard/store";
import { getAllMetricNames, getMetric } from "@/lib/metrics/registry";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function DashboardPage() {
  const { selectedAccountId, user } = useAuth();
  const { 
    widgets, 
    metricsRegistry,
    setMetricsRegistry,
    addWidget 
  } = useDashboardStore();
  const [isLoading, setIsLoading] = useState(true);

  // Load metrics registry (keeping existing backend logic)
  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const metricNames = getAllMetricNames();
        const dashboardMetrics = metricNames
          .map(name => {
            const metric = getMetric(name);
            return metric ? {
              name: metric.name,
              displayName: metric.name,
              description: metric.description,
              category: "General",
              supportedBreakdowns: ["total" as const],
              recommendedVisualizations: ["kpi" as const],
              formula: `${metric.breakdownType} breakdown`
            } : null;
          })
          .filter(Boolean);

        setMetricsRegistry(dashboardMetrics.filter(m => m !== null));
      } catch (error) {
        console.error('Failed to load metrics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMetrics();
  }, [setMetricsRegistry]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-full flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Temporarily disable auth checks for public testing
  // if (!user) {
  //   return (
  //     <DashboardLayout>
  //       <div className="min-h-full flex items-center justify-center">
  //         <div className="text-center">
  //           <h2 className="text-xl font-semibold text-gray-900">Please log in</h2>
  //           <p className="mt-2 text-gray-600">You need to be logged in to view this page.</p>
  //         </div>
  //       </div>
  //     </DashboardLayout>
  //   );
  // }

  // if (!selectedAccountId) {
  //   return (
  //     <DashboardLayout>
  //       <div className="min-h-full flex items-center justify-center">
  //         <div className="text-center">
  //           <h2 className="text-xl font-semibold text-gray-900">Select an Account</h2>
  //           <p className="mt-2 text-gray-600">Please select an account from the sidebar to continue.</p>
  //         </div>
  //       </div>
  //     </DashboardLayout>
  //   );
  // }

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Sample Dashboard Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* KPI Cards */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Total Revenue</span>
              <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">+12.5%</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">$124,592</div>
            <div className="mt-2 text-xs text-gray-500">vs last period</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Appointments</span>
              <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">+8.2%</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">142</div>
            <div className="mt-2 text-xs text-gray-500">This month</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Conversion Rate</span>
              <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">-2.4%</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">23.8%</div>
            <div className="mt-2 text-xs text-gray-500">Average</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Active Users</span>
              <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">+5</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">89</div>
            <div className="mt-2 text-xs text-gray-500">Team members</div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Overview</h3>
            <div className="h-64 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p>Chart will be rendered here</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
            <div className="h-64 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
                <p>Chart will be rendered here</p>
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Status */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Backend Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{metricsRegistry.length}</div>
              <div className="text-sm text-green-800">Metrics Available</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{widgets.length}</div>
              <div className="text-sm text-blue-800">Widgets Created</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">✓</div>
              <div className="text-sm text-purple-800">Backend Ready</div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 