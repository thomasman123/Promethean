"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DashboardWidget, DashboardView, MetricDefinition, WidgetPosition, ViewScope } from './types';
import { METRICS_REGISTRY } from '../metrics/registry';

interface DashboardStore {
  // Account management
  selectedAccountId: string | null;
  setSelectedAccount: (accountId: string | null) => void;
  
  // Current view
  currentView: DashboardView | null;
  setCurrentView: (view: DashboardView | null) => void;
  initializeDefaultView: () => void;
  
  // Widgets - these are now derived from currentView
  widgets: DashboardWidget[];
  addWidget: (widget: Omit<DashboardWidget, 'id' | 'position'> & { position?: WidgetPosition }) => Promise<void>;
  removeWidget: (widgetId: string) => Promise<void>;
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
  loadViews: (accountId: string) => Promise<void>;
  createView: (view: Omit<DashboardView, 'id' | 'createdAt' | 'updatedAt' | 'widgets'>) => Promise<void>;
  updateView: (viewId: string, updates: Partial<DashboardView>) => Promise<void>;
  deleteView: (viewId: string) => Promise<void>;
  getViewsForAccount: (accountId: string) => DashboardView[];
}

// Default widgets for new views
const DEFAULT_WIDGETS: DashboardWidget[] = [
  {
    id: 'widget-1',
    metricName: 'cash_collected',
    breakdown: 'total',
    vizType: 'kpi',
    position: { x: 0, y: 0 },
    size: { w: 3, h: 2 }
  },
  {
    id: 'widget-2',
    metricName: 'total_appointments',
    breakdown: 'total',
    vizType: 'kpi',
    position: { x: 3, y: 0 },
    size: { w: 3, h: 2 }
  },
  {
    id: 'widget-3',
    metricName: 'show_up_rate',
    breakdown: 'total',
    vizType: 'kpi',
    position: { x: 6, y: 0 },
    size: { w: 3, h: 2 }
  },
  {
    id: 'widget-4',
    metricName: 'sales_made',
    breakdown: 'total',
    vizType: 'kpi',
    position: { x: 9, y: 0 },
    size: { w: 3, h: 2 }
  }
];

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set, get) => ({
      // Account management
      selectedAccountId: null,
      setSelectedAccount: (accountId) => {
        set({ selectedAccountId: accountId });
        // When account changes, reset to default view or first available view
        const views = get().getViewsForAccount(accountId || '');
        if (views.length > 0) {
          // Look for default view first
          const defaultView = views.find(v => v.isDefault);
          set({ currentView: defaultView || views[0] });
        } else {
          // No views exist, reset to null (will use default widgets)
          set({ currentView: null });
        }
      },
      
      // Current view
      currentView: null,
      setCurrentView: (view) => set({ currentView: view }),
      
      // Initialize default view if needed
      initializeDefaultView: () => {
        const state = get();
        console.log('🚀 initializeDefaultView called:', { 
          hasCurrentView: !!state.currentView, 
          accountId: state.selectedAccountId,
          viewsCount: state.views.length 
        });
        
        if (!state.currentView && state.selectedAccountId) {
          const defaultViewId = `default-view-${state.selectedAccountId}`;
          const existingView = state.views.find(v => v.id === defaultViewId);
          
          if (existingView) {
            console.log('📂 Using existing default view:', existingView.id);
            set({ currentView: existingView });
          } else {
            console.log('🆕 Creating new default view for account:', state.selectedAccountId);
            const tempView: DashboardView = {
              id: defaultViewId,
              name: 'Default View',
              accountId: state.selectedAccountId,
              createdBy: 'system',
              scope: 'team',
              isPrivate: false,
              filters: {},
              widgets: [...DEFAULT_WIDGETS],
              compareMode: false,
              compareEntities: [],
              isDefault: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            
            set((state) => ({
              views: [...state.views, tempView],
              currentView: tempView
            }));
            console.log('✅ Created and set default view:', tempView.id);
          }
        } else {
          console.log('ℹ️  No need to initialize default view');
        }
      },
      
      // Widgets - now computed from current view
      get widgets() {
        const state = get();
        const widgets = state.currentView?.widgets || [];
        console.log('🎯 widgets getter called:', {
          currentViewId: state.currentView?.id,
          widgetCount: widgets.length,
          widgets: widgets.map(w => ({ id: w.id, metric: w.metricName }))
        });
        return widgets;
      },
      
      addWidget: async (widget) => {
        console.log('🔧 addWidget called with:', widget);
        
        // Ensure we have a current view
        get().initializeDefaultView();
        
        const state = get();
        console.log('📊 Current state:', { 
          currentView: state.currentView?.id, 
          accountId: state.selectedAccountId,
          viewsCount: state.views.length 
        });
        
        if (!state.currentView) {
          console.error('❌ No current view to add widget to');
          return;
        }
        
        const currentWidgets = state.currentView.widgets || [];
        
        // Find next available position
        const findNextPosition = () => {
          const occupiedPositions = new Set(
            currentWidgets.map(w => `${w.position.x},${w.position.y}`)
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
          return { x: 0, y: Math.max(0, ...currentWidgets.map(w => w.position.y + w.size.h)) };
        };

        const newWidget: DashboardWidget = {
          ...widget,
          id: `widget-${Date.now()}`,
          position: widget.position || findNextPosition(),
          size: widget.size || { w: 4, h: 2 } // Default size
        };
        
        console.log('✨ Created new widget:', newWidget);
        
        // Update the current view's widgets
        const updatedWidgets = [...(state.currentView.widgets || []), newWidget];
        console.log('📝 Updated widgets array:', updatedWidgets.length, 'widgets');
        
        set((state) => ({
          views: state.views.map(v => 
            v.id === state.currentView?.id 
              ? { ...v, widgets: updatedWidgets }
              : v
          ),
          currentView: state.currentView 
            ? { ...state.currentView, widgets: updatedWidgets }
            : null
        }));

        console.log('💾 Local state updated, now saving to database...');

        // Save to database
        try {
          await get().updateView(state.currentView.id, { widgets: updatedWidgets });
          console.log('✅ Widget saved to database successfully');
        } catch (error) {
          console.error('❌ Failed to save widget to database:', error);
          throw error; // Re-throw so the UI can handle it
        }
      },
      
      removeWidget: async (widgetId) => {
        // Ensure we have a current view
        get().initializeDefaultView();
        
        const state = get();
        if (!state.currentView) return;
        
        const updatedWidgets = (state.currentView.widgets || []).filter(w => w.id !== widgetId);
        
        set((state) => ({
          views: state.views.map(v => 
            v.id === state.currentView?.id 
              ? { ...v, widgets: updatedWidgets }
              : v
          ),
          currentView: state.currentView 
            ? { ...state.currentView, widgets: updatedWidgets }
            : null
        }));

        // Save to database
        try {
          await get().updateView(state.currentView.id, { widgets: updatedWidgets });
        } catch (error) {
          console.error('Failed to save widget removal to database:', error);
        }
      },
      
      updateWidget: (widgetId, updates) => {
        const state = get();
        if (!state.currentView) return;
        
        set((state) => ({
          views: state.views.map(v => 
            v.id === state.currentView?.id 
              ? { ...v, widgets: (v.widgets || []).map(w => w.id === widgetId ? { ...w, ...updates } : w) }
              : v
          ),
          currentView: state.currentView 
            ? { ...state.currentView, widgets: (state.currentView.widgets || []).map(w => w.id === widgetId ? { ...w, ...updates } : w) }
            : null
        }));
      },

      updateWidgetSize: (widgetId, width, height) => {
        const state = get();
        if (!state.currentView) return;
        
        set((state) => ({
          views: state.views.map(v => 
            v.id === state.currentView?.id 
              ? { 
                  ...v, 
                  widgets: (v.widgets || []).map(w => 
                    w.id === widgetId 
                      ? { ...w, size: { w: Math.round(width / 250), h: Math.round(height / 200) } }
                      : w
                  )
                }
              : v
          ),
          currentView: state.currentView 
            ? { 
                ...state.currentView, 
                widgets: (state.currentView.widgets || []).map(w => 
                  w.id === widgetId 
                    ? { ...w, size: { w: Math.round(width / 250), h: Math.round(height / 200) } }
                    : w
                )
              }
            : null
        }));
      },

      updateWidgetLayout: (layout) => {
        const state = get();
        if (!state.currentView) return;
        
        set((state) => ({
          views: state.views.map(v => 
            v.id === state.currentView?.id 
              ? { 
                  ...v, 
                  widgets: (v.widgets || []).map(widget => {
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
                }
              : v
          ),
          currentView: state.currentView 
            ? { 
                ...state.currentView, 
                widgets: (state.currentView.widgets || []).map(widget => {
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
              }
            : null
        }));
      },
      
      reorderWidgets: (widgetIds) => {
        const state = get();
        if (!state.currentView) return;
        
        const widgetMap = new Map((state.currentView.widgets || []).map((w) => [w.id, w]));
        const reorderedWidgets = widgetIds
          .map((id) => widgetMap.get(id))
          .filter((w): w is DashboardWidget => w !== undefined);
        
        set((state) => ({
          views: state.views.map(v => 
            v.id === state.currentView?.id 
              ? { ...v, widgets: reorderedWidgets }
              : v
          ),
          currentView: state.currentView 
            ? { ...state.currentView, widgets: reorderedWidgets }
            : null
        }));
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
      
      loadViews: async (accountId) => {
        try {
          const response = await fetch(`/api/dashboard/views?accountId=${accountId}`);
          if (!response.ok) {
            throw new Error(`Failed to load views: ${response.status}`);
          }
          const data = await response.json();
          set({ views: data.views || [] });
        } catch (error) {
          console.error('Error loading views:', error);
          set({ views: [] });
        }
      },
      
      createView: async (view) => {
        try {
          const response = await fetch('/api/dashboard/views', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(view)
          });
          
          if (!response.ok) {
            throw new Error(`Failed to create view: ${response.status}`);
          }
          
          const data = await response.json();
          const newView = data.view;
          
          set((state) => ({ 
            views: [...state.views, newView],
            currentView: newView // Set the newly created view as current
          }));
        } catch (error) {
          console.error('Error creating view:', error);
          throw error;
        }
      },
      
      updateView: async (viewId, updates) => {
        try {
          const response = await fetch('/api/dashboard/views', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: viewId, ...updates })
          });
          
          if (!response.ok) {
            throw new Error(`Failed to update view: ${response.status}`);
          }
          
          const data = await response.json();
          const updatedView = data.view;
          
          set((state) => ({
            views: state.views.map((v) => v.id === viewId ? updatedView : v),
            currentView: state.currentView?.id === viewId ? updatedView : state.currentView
          }));
        } catch (error) {
          console.error('Error updating view:', error);
          throw error;
        }
      },
      
      deleteView: async (viewId) => {
        try {
          const response = await fetch(`/api/dashboard/views?id=${viewId}`, {
            method: 'DELETE'
          });
          
          if (!response.ok) {
            throw new Error(`Failed to delete view: ${response.status}`);
          }
          
          set((state) => ({
            views: state.views.filter((v) => v.id !== viewId),
            currentView: state.currentView?.id === viewId ? null : state.currentView
          }));
        } catch (error) {
          console.error('Error deleting view:', error);
          throw error;
        }
      },
      
      getViewsForAccount: (accountId) => {
        const state = get();
        return state.views.filter(v => v.accountId === accountId);
      }
    }),
    {
      name: 'dashboard-store'
    }
  )
); 