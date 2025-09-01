"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardStore } from "@/lib/dashboard/store";
import { getAllMetricNames, getMetric } from "@/lib/metrics/registry";

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please log in</h1>
          <p className="text-gray-600">You need to be authenticated to access the dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Account: {selectedAccountId || 'None selected'}
              </span>
              <span className="text-sm text-gray-600">
                User: {user.email}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Metrics Registry Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Backend Status</h2>
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

          {/* Available Metrics */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {metricsRegistry.map((metric) => (
                <div key={metric.name} className="p-3 border rounded-lg hover:bg-gray-50">
                  <div className="font-medium text-gray-900">{metric.displayName}</div>
                  <div className="text-sm text-gray-600 mt-1">{metric.description}</div>
                  <div className="text-xs text-gray-500 mt-2">
                    Category: {metric.category}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Clean Slate Message */}
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              🎉 Clean Slate Frontend
            </h2>
            <p className="text-gray-600 mb-4">
              All UI components have been removed. Backend functionality is fully preserved and ready.
            </p>
            <div className="text-sm text-gray-500">
              Ready to build a beautiful new frontend from scratch!
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 