"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DashboardWidget, DashboardView, MetricDefinition, WidgetPosition } from './types';
import { METRICS_REGISTRY } from '../metrics/registry';

interface DashboardStore {
  // Current view
  currentView: DashboardView | null;
  setCurrentView: (view: DashboardView | null) => void;
  
  // Widgets
  widgets: DashboardWidget[];
  addWidget: (widget: Omit<DashboardWidget, 'id' | 'position'> & { position?: WidgetPosition }) => void;
  removeWidget: (widgetId: string) => void;
  updateWidget: (widgetId: string, updates: Partial<DashboardWidget>) => void;
  updateWidgetSize: (widgetId: string, width: number, height: number) => void;
  updateWidgetLayout: (layout: any[]) => void;
  reorderWidgets: (widgetIds: string[]) => void;
  
  // Filters
  filters: {
    dateRange?: { start: Date; end: Date };
    accountId?: string;
    repIds?: string[];
    setterIds?: string[];
    utm_source?: string[];
    utm_medium?: string[];
    utm_campaign?: string[];
    utm_content?: string[];
    utm_term?: string[];
    utm_id?: string[];
    source_category?: string[];
    specific_source?: string[];
    session_source?: string[];
    referrer?: string[];
    fbclid?: string[];
    fbc?: string[];
    fbp?: string[];
    gclid?: string[];
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
          metricName: 'cash_collected',
          breakdown: 'total',
          vizType: 'kpi', // KPI Tile preset
          position: { x: 0, y: 0 },
          size: { w: 3, h: 2 }
        },
        {
          id: 'widget-2',
          metricName: 'total_appointments',
          breakdown: 'total',
          vizType: 'kpi', // KPI Tile preset
          position: { x: 3, y: 0 },
          size: { w: 3, h: 2 }
        },
        {
          id: 'widget-3',
          metricName: 'show_up_rate',
          breakdown: 'total',
          vizType: 'kpi', // KPI Tile preset
          position: { x: 6, y: 0 },
          size: { w: 3, h: 2 }
        },
        {
          id: 'widget-4',
          metricName: 'sales_made',
          breakdown: 'total',
          vizType: 'kpi', // KPI Tile preset
          position: { x: 9, y: 0 },
          size: { w: 3, h: 2 }
        }
      ],
      
      addWidget: (widget) => {
        const state = get();
        
        // Find next available position
        const findNextPosition = () => {
          const occupiedPositions = new Set(
            state.widgets.map(w => `${w.position.x},${w.position.y}`)
          );
          
          // Try to place in a grid pattern
          for (let y = 0; y < 10; y++) {
            for (let x = 0; x < 12; x += widget.size?.w || 2) {
              const posKey = `${x},${y}`;
              if (!occupiedPositions.has(posKey)) {
                return { x, y };
              }
            }
          }
          
          // Fallback: place at end
          return { x: 0, y: Math.max(0, ...state.widgets.map(w => w.position.y + w.size.h)) };
        };

        const newWidget: DashboardWidget = {
          ...widget,
          id: `widget-${Date.now()}`,
          position: widget.position || findNextPosition(),
          size: widget.size || { w: 4, h: 2 } // Default size
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

      updateWidgetLayout: (layout) => {
        set((state) => ({
          widgets: state.widgets.map((widget) => {
            const layoutItem = layout.find((item) => item.i === widget.id);
            if (layoutItem) {
              return {
                ...widget,
                position: { x: layoutItem.x, y: layoutItem.y },
                size: { w: layoutItem.w, h: layoutItem.h }
              };
            }
            return widget;
          })
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