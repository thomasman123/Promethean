"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DashboardWidget, DashboardView, MetricDefinition } from './types';
import { METRICS_REGISTRY } from '../metrics/registry';

interface DashboardStore {
  // Current view
  currentView: DashboardView | null;
  setCurrentView: (view: DashboardView) => void;
  
  // Widgets
  widgets: DashboardWidget[];
  addWidget: (widget: Omit<DashboardWidget, 'id'>) => void;
  removeWidget: (widgetId: string) => void;
  updateWidget: (widgetId: string, updates: Partial<DashboardWidget>) => void;
  updateWidgetSize: (widgetId: string, width: number, height: number) => void;
  reorderWidgets: (widgetIds: string[]) => void;
  
  // Filters
  filters: {
    dateRange?: { start: Date; end: Date };
    accounts?: string[];
    users?: string[];
  };
  setFilters: (filters: any) => void;
  
  // Metrics
  metricsRegistry: MetricDefinition[];
  
  // Views management
  views: DashboardView[];
  createView: (view: Omit<DashboardView, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateView: (viewId: string, updates: Partial<DashboardView>) => void;
  deleteView: (viewId: string) => void;
}

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set, get) => ({
      // Current view
      currentView: null,
      setCurrentView: (view) => set({ currentView: view }),
      
      // Widgets with default set
      widgets: [
        {
          id: 'widget-1',
          metricName: 'total_revenue',
          breakdown: 'total',
          vizType: 'kpi',
          position: { x: 0, y: 0 },
          size: { w: 1, h: 1 }
        },
        {
          id: 'widget-2',
          metricName: 'appointments_scheduled',
          breakdown: 'total',
          vizType: 'kpi',
          position: { x: 1, y: 0 },
          size: { w: 1, h: 1 }
        },
        {
          id: 'widget-3',
          metricName: 'conversion_rate',
          breakdown: 'total',
          vizType: 'kpi',
          position: { x: 2, y: 0 },
          size: { w: 1, h: 1 }
        },
        {
          id: 'widget-4',
          metricName: 'active_users',
          breakdown: 'total',
          vizType: 'kpi',
          position: { x: 3, y: 0 },
          size: { w: 1, h: 1 }
        }
      ],
      
      addWidget: (widget) => {
        const newWidget: DashboardWidget = {
          ...widget,
          id: `widget-${Date.now()}`
        };
        set((state) => ({ widgets: [...state.widgets, newWidget] }));
      },
      
      removeWidget: (widgetId) => {
        set((state) => ({
          widgets: state.widgets.filter((w) => w.id !== widgetId)
        }));
      },
      
      updateWidget: (widgetId, updates) => {
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === widgetId ? { ...w, ...updates } : w
          )
        }));
      },

      updateWidgetSize: (widgetId, width, height) => {
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === widgetId 
              ? { ...w, size: { w: Math.round(width / 250), h: Math.round(height / 200) } }
              : w
          )
        }));
      },
      
      reorderWidgets: (widgetIds) => {
        set((state) => {
          const widgetMap = new Map(state.widgets.map((w) => [w.id, w]));
          return {
            widgets: widgetIds
              .map((id) => widgetMap.get(id))
              .filter((w): w is DashboardWidget => w !== undefined)
          };
        });
      },
      
      // Filters
      filters: {},
      setFilters: (filters) => set({ filters }),
      
      // Metrics - convert registry to array
      metricsRegistry: Object.entries(METRICS_REGISTRY).map(([key, metric]) => ({
        name: key,
        displayName: metric.name,
        description: metric.description,
        category: 'metrics',
        supportedBreakdowns: ['total', 'rep', 'setter'],
        recommendedVisualizations: ['kpi', 'line', 'bar'],
        unit: metric.unit
      })),
      
      // Views
      views: [],
      createView: (view) => {
        const newView: DashboardView = {
          ...view,
          id: `view-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        set((state) => ({ views: [...state.views, newView] }));
      },
      
      updateView: (viewId, updates) => {
        set((state) => ({
          views: state.views.map((v) =>
            v.id === viewId
              ? { ...v, ...updates, updatedAt: new Date().toISOString() }
              : v
          )
        }));
      },
      
      deleteView: (viewId) => {
        set((state) => ({
          views: state.views.filter((v) => v.id !== viewId),
          currentView:
            state.currentView?.id === viewId ? null : state.currentView
        }));
      }
    }),
    {
      name: 'dashboard-store'
    }
  )
); 