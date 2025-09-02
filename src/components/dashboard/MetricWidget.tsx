"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { KPIWidget } from '@/components/ui/Card';
import { useDashboardStore } from '@/lib/dashboard/store';
import { useAuth } from '@/hooks/useAuth';
import type { DashboardWidget } from '@/lib/dashboard/types';

interface MetricWidgetProps {
  widget: DashboardWidget;
}

interface MetricData {
  metricName: string;
  breakdown: string;
  data: {
    value: number | string;
    change?: {
      value: string;
      trend: 'up' | 'down' | 'neutral';
    };
  };
}

export function MetricWidget({ widget }: MetricWidgetProps) {
  const [data, setData] = useState<MetricData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  
  const { filters } = useDashboardStore();
  const { selectedAccountId } = useAuth();

  // Memoize filters to prevent unnecessary re-fetches
  const stableFilters = useMemo(() => JSON.stringify(filters), [filters]);

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedAccountId) return;
      
      setIsLoading(true);
      setError(undefined);

      try {
        // Build request filters
        const requestFilters = {
          dateRange: filters.dateRange || {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
            end: new Date().toISOString()
          },
          accountId: selectedAccountId,
          repIds: filters.repIds,
          setterIds: filters.setterIds,
          utm_source: filters.utm_source,
          utm_medium: filters.utm_medium,
          utm_campaign: filters.utm_campaign,
          utm_content: filters.utm_content,
          utm_term: filters.utm_term,
          utm_id: filters.utm_id,
          source_category: filters.source_category,
          specific_source: filters.specific_source,
          session_source: filters.session_source,
          referrer: filters.referrer,
          fbclid: filters.fbclid,
          fbc: filters.fbc,
          fbp: filters.fbp,
          gclid: filters.gclid,
        };

        const response = await fetch('/api/metrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metricName: widget.metricName,
            filters: requestFilters,
            vizType: widget.vizType,
            breakdown: widget.breakdown,
            widgetSettings: widget.settings
          })
        });

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const apiResult = await response.json();
        const engineResult = apiResult?.result;

        if (engineResult?.type === 'total' && engineResult?.data) {
          setData({
            metricName: widget.metricName,
            breakdown: widget.breakdown,
            data: {
              value: engineResult.data.value || 0,
              change: engineResult.data.change
            }
          });
        } else {
          setData({
            metricName: widget.metricName,
            breakdown: widget.breakdown,
            data: { value: 0 }
          });
        }
      } catch (err) {
        console.error('Error fetching metric data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [widget.metricName, widget.breakdown, widget.vizType, selectedAccountId, stableFilters, widget.settings]);

  // Format the value based on metric unit
  const formatValue = (value: number | string, unit?: string) => {
    if (typeof value === 'string') return value;
    
    switch (unit) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(value);
      case 'percent':
        return `${(value * 100).toFixed(1)}%`;
      case 'seconds':
        // Convert seconds to human readable format
        if (value < 60) return `${Math.round(value)}s`;
        if (value < 3600) return `${Math.floor(value / 60)}m ${Math.round(value % 60)}s`;
        return `${Math.floor(value / 3600)}h ${Math.floor((value % 3600) / 60)}m`;
      case 'days':
        return `${value} days`;
      case 'count':
      default:
        return new Intl.NumberFormat('en-US').format(value);
    }
  };

  // Get metric definition for unit info
  const { metricsRegistry } = useDashboardStore();
  const metricDef = metricsRegistry.find(m => m.name === widget.metricName);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-red-500 text-sm font-medium mb-1">Error</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">{error}</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-zinc-500 dark:text-zinc-400 text-sm">No data</div>
      </div>
    );
  }

  return (
    <KPIWidget
      label={widget.settings?.title || metricDef?.displayName || widget.metricName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
      value={formatValue(data.data.value, metricDef?.unit)}
      change={data.data.change}
    />
  );
} 