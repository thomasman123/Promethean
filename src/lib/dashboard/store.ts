"use client";

import { create } from 'zustand';
import { 
  DashboardView, 
  DashboardWidget, 
  DashboardFilters, 
  CompareEntity,
  CompareModeSettings,
  MetricDefinition,
  ViewScope,
  CompareScope,
  AttributionMode
} from './types';
import { supabase } from '@/lib/supabase';

interface MetricsCacheEntry {
  data: any;
  fetchedAt: number;
}

interface DashboardState {
  // Current view
  currentView: DashboardView | null;
  views: DashboardView[];
  isLoadingViews: boolean;
  
  // Widgets
  widgets: DashboardWidget[];
  selectedWidgetId: string | null;
  
  // Filters
  filters: DashboardFilters;
  
  // Compare mode
  compareMode: boolean;
  compareEntities: CompareEntity[];
  compareModeSettings: CompareModeSettings;
  
  // Metrics registry
  metricsRegistry: MetricDefinition[];
  isLoadingRegistry: boolean;
  
  // UI state
  isAddWidgetModalOpen: boolean;
  isViewManagerOpen: boolean;
  isDirty: boolean; // Track unsaved changes
 
  // Simple preloaded metrics cache (resets on refresh)
  metricsCache: Record<string, MetricsCacheEntry>;

  // Actions
  setCurrentView: (view: DashboardView) => void;
  setViews: (views: DashboardView[]) => void;

  // Views persistence
  loadViewsForAccount: (accountId: string) => Promise<void>;
  createView: (name: string, scope: ViewScope, notes: string | undefined, accountId: string, options?: { copyCurrent?: boolean }) => Promise<void>;
  updateView: (viewId: string, updates: Partial<DashboardView>) => Promise<void>;
  deleteView: (viewId: string) => Promise<void>;
  duplicateView: (viewId: string, newName: string) => Promise<void>;
  loadView: (viewId: string) => Promise<void>;
  
  // Widget actions
  addWidget: (widget: Omit<DashboardWidget, 'id'>) => void;
  updateWidget: (widgetId: string, updates: Partial<DashboardWidget>) => void;
  removeWidget: (widgetId: string) => void;
  duplicateWidget: (widgetId: string) => void;
  updateWidgetLayout: (layouts: Array<{ i: string; x: number; y: number; w: number; h: number }>) => void;
  
  // Filter actions
  setFilters: (filters: Partial<DashboardFilters>) => void;
  clearFilters: () => void;
  
  // Compare mode actions
  toggleCompareMode: () => void;
  addCompareEntity: (entity: CompareEntity) => void;
  removeCompareEntity: (entityId: string) => void;
  clearCompareEntities: () => void;
  updateCompareModeSettings: (settings: Partial<CompareModeSettings>) => void;
  
  // Registry actions
  setMetricsRegistry: (metrics: MetricDefinition[]) => void;
  setLoadingRegistry: (loading: boolean) => void;
  
  // UI actions
  setAddWidgetModalOpen: (isOpen: boolean) => void;
  setViewManagerOpen: (isOpen: boolean) => void;
  setSelectedWidget: (widgetId: string | null) => void;
  
  // Save current
  saveCurrentView: () => Promise<void>;
  resetToSaved: () => void;

  // Cache helpers
  getCachedMetric: (key: string) => any | undefined;
  setCachedMetric: (key: string, data: any) => void;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  // Grid minimums used across the app
  // Keep these in sync with `DashboardGrid` minW/minH
  // If changed there, update here too
  // Alternatively, these could be moved to a shared config
  // but keeping local for now to avoid extra imports
  
  // Initial state
  currentView: null,
  views: [],
  isLoadingViews: false,
  widgets: [],
  selectedWidgetId: null,
  filters: {},
  compareMode: false,
  compareEntities: [],
  compareModeSettings: {
    scope: 'setter',
    attributionMode: 'primary',
    excludeInCallDials: true,
    excludeRepDials: true
  },
  metricsRegistry: [],
  isLoadingRegistry: false,
  isAddWidgetModalOpen: false,
  isViewManagerOpen: false,
  isDirty: false,
  metricsCache: {},
 
  // View actions
  setCurrentView: (view) => set({ 
    currentView: view,
    widgets: view.widgets,
    filters: view.filters,
    compareMode: view.compareMode,
    compareEntities: view.compareEntities,
    compareModeSettings: (view as any).compareModeSettings || {
      scope: 'setter',
      attributionMode: 'primary',
      excludeInCallDials: true,
      excludeRepDials: true
    },
    isDirty: false
  }),
  
  setViews: (views) => set({ views }),

  loadViewsForAccount: async (accountId: string) => {
    if (!accountId) return;
    set({ isLoadingViews: true });
    const { data, error } = await supabase
      .from('dashboard_views')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('Failed to load views:', error);
      set({ views: [], isLoadingViews: false });
      return;
    }

    // Map to DashboardView type if needed (keys are snake_case in DB)
    const views: DashboardView[] = (data || []).map((v: any) => ({
      id: v.id,
      name: v.name,
      accountId: v.account_id,
      createdBy: v.created_by,
      scope: v.scope,
      notes: v.notes || undefined,
      filters: v.filters || {},
      widgets: v.widgets || [],
      compareMode: !!v.compare_mode,
      compareEntities: v.compare_entities || [],
      isDefault: !!v.is_default,
      createdAt: v.created_at,
      updatedAt: v.updated_at,
    }));

    set({ views, isLoadingViews: false });

    // Set current view if not set
    const state = get();
    if (!state.currentView) {
      const defaultView = views.find(v => v.isDefault) || views[0] || null;
      if (defaultView) {
        state.setCurrentView(defaultView);
      }
    }
  },

  createView: async (name, scope, notes, accountId, options) => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId || !accountId) {
      console.warn('Missing userId or accountId when creating view');
      return;
    }

    const state = get();
    const copyCurrent = options?.copyCurrent !== false;
    const payload = {
      name,
      account_id: accountId,
      created_by: userId,
      scope,
      notes: notes || '',
      filters: copyCurrent ? state.filters : {},
      widgets: copyCurrent ? state.widgets : [],
      compare_mode: copyCurrent ? state.compareMode : false,
      compare_entities: copyCurrent ? state.compareEntities : [],
      is_default: false,
    };

    const { data, error } = await supabase
      .from('dashboard_views')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      console.warn('Failed to create view:', error);
      return;
    }

    // Refresh views list and set current view to the newly created one
    await get().loadViewsForAccount(accountId);
    if (data) {
      const newView: DashboardView = {
        id: data.id,
        name: data.name,
        accountId: data.account_id,
        createdBy: data.created_by,
        scope: data.scope,
        notes: data.notes || undefined,
        filters: data.filters || {},
        widgets: data.widgets || [],
        compareMode: !!data.compare_mode,
        compareEntities: data.compare_entities || [],
        isDefault: !!data.is_default,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
      set({ currentView: newView });
      // Ensure local state reflects saved view
      get().setCurrentView(newView);
    }
  },

  updateView: async (viewId, updates) => {
    // Map camelCase updates to snake_case
    const mapped: any = {};
    if (updates.name !== undefined) mapped.name = updates.name;
    if ((updates as any).accountId !== undefined) mapped.account_id = (updates as any).accountId;
    if ((updates as any).createdBy !== undefined) mapped.created_by = (updates as any).createdBy;
    if (updates.scope !== undefined) mapped.scope = updates.scope;
    if (updates.notes !== undefined) mapped.notes = updates.notes || '';
    if (updates.filters !== undefined) mapped.filters = updates.filters;
    if (updates.widgets !== undefined) mapped.widgets = updates.widgets;
    if (updates.compareMode !== undefined) mapped.compare_mode = updates.compareMode;
    if (updates.compareEntities !== undefined) mapped.compare_entities = updates.compareEntities;
    if (updates.isDefault !== undefined) mapped.is_default = updates.isDefault;

    const { data, error } = await supabase
      .from('dashboard_views')
      .update(mapped)
      .eq('id', viewId)
      .select('*')
      .single();

    if (error) {
      console.warn('Failed to update view:', error);
      return;
    }

    // Update local cache
    set((state) => ({
      views: state.views.map(v => v.id === viewId ? {
        ...v,
        name: data.name,
        notes: data.notes || undefined,
        scope: data.scope,
        filters: data.filters || {},
        widgets: data.widgets || [],
        compareMode: !!data.compare_mode,
        compareEntities: data.compare_entities || [],
        isDefault: !!data.is_default,
        updatedAt: data.updated_at,
      } : v)
    }));
  },

  deleteView: async (viewId) => {
    const { data: existing } = await supabase
      .from('dashboard_views')
      .select('account_id')
      .eq('id', viewId)
      .single();

    const { error } = await supabase
      .from('dashboard_views')
      .delete()
      .eq('id', viewId);

    if (error) {
      console.warn('Failed to delete view:', error);
      return;
    }

    // Refresh list and clear current if it was deleted
    if (existing?.account_id) {
      await get().loadViewsForAccount(existing.account_id);
    }
    set((state) => ({
      currentView: state.currentView?.id === viewId ? null : state.currentView,
    }));
  },

  duplicateView: async (viewId: string, newName: string) => {
    const { data: view, error: loadError } = await supabase
      .from('dashboard_views')
      .select('*')
      .eq('id', viewId)
      .single();

    if (loadError || !view) {
      console.warn('Failed to load view to duplicate:', loadError);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    const payload = {
      name: newName,
      account_id: view.account_id,
      created_by: userId,
      scope: view.scope,
      notes: view.notes || '',
      filters: view.filters || {},
      widgets: view.widgets || [],
      compare_mode: !!view.compare_mode,
      compare_entities: view.compare_entities || [],
      is_default: false,
    };

    const { error: dupError } = await supabase
      .from('dashboard_views')
      .insert(payload);

    if (dupError) {
      console.warn('Failed to duplicate view:', dupError);
      return;
    }

    await get().loadViewsForAccount(view.account_id);
  },

  loadView: async (viewId) => {
    const { data, error } = await supabase
      .from('dashboard_views')
      .select('*')
      .eq('id', viewId)
      .single();

    if (error || !data) {
      console.warn('Failed to load view by id:', error);
      return;
    }

    const view: DashboardView = {
      id: data.id,
      name: data.name,
      accountId: data.account_id,
      createdBy: data.created_by,
      scope: data.scope,
      notes: data.notes || undefined,
      filters: data.filters || {},
      widgets: data.widgets || [],
      compareMode: !!data.compare_mode,
      compareEntities: data.compare_entities || [],
      isDefault: !!data.is_default,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    get().setCurrentView(view);
  },
  
  // Widget actions
  addWidget: (widget) => {
    const MIN_W = 4; // Standard width for 3 widgets per row (12/3 = 4)
    const MIN_H = 4; // Standard height for better aspect ratio
    const newWidget = {
      ...widget,
      size: {
        w: Math.max(widget.size?.w ?? MIN_W, MIN_W),
        h: Math.max(widget.size?.h ?? MIN_H, MIN_H),
      },
      id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    set((state) => ({
      widgets: [...state.widgets, newWidget],
      isDirty: true
    }));
  },
  
  updateWidget: (widgetId, updates) => {
    set((state) => ({
      widgets: state.widgets.map(w => 
        w.id === widgetId ? { ...w, ...updates } : w
      ),
      isDirty: true
    }));
  },
  
  removeWidget: (widgetId) => {
    set((state) => ({
      widgets: state.widgets.filter(w => w.id !== widgetId),
      selectedWidgetId: state.selectedWidgetId === widgetId ? null : state.selectedWidgetId,
      isDirty: true
    }));
  },
  
  duplicateWidget: (widgetId) => {
    const widget = get().widgets.find(w => w.id === widgetId);
    if (!widget) return;
    
    const MIN_W = 4; // Standard width for 3 widgets per row (12/3 = 4)
    const MIN_H = 4; // Standard height for better aspect ratio
    const newWidget = {
      ...widget,
      id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      position: {
        x: (widget.position.x + widget.size.w) % 12,
        y: widget.position.y
      },
      size: {
        w: Math.max(widget.size?.w ?? MIN_W, MIN_W),
        h: Math.max(widget.size?.h ?? MIN_H, MIN_H),
      }
    };
    
    set((state) => ({
      widgets: [...state.widgets, newWidget],
      isDirty: true
    }));
  },
  
  updateWidgetLayout: (layouts) => {
    set((state) => ({
      widgets: state.widgets.map(widget => {
        const layout = layouts.find(l => l.i === widget.id);
        if (!layout) return widget;
        return {
          ...widget,
          position: { x: layout.x, y: layout.y },
          size: { w: layout.w, h: layout.h }
        };
      }),
      isDirty: true
    }));
  },
  
  // Filter actions
  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
      isDirty: true
    }));
  },
  
  clearFilters: () => {
    set({ filters: {}, isDirty: true });
  },
  
  // Compare mode actions
  toggleCompareMode: () => {
    set((state) => ({
      compareMode: !state.compareMode,
      compareEntities: state.compareMode ? [] : state.compareEntities,
      isDirty: true
    }));
  },
  
  addCompareEntity: (entity) => {
    set((state) => ({
      compareEntities: [...state.compareEntities, entity],
      isDirty: true
    }));
  },
  
  removeCompareEntity: (entityId) => {
    set((state) => ({
      compareEntities: state.compareEntities.filter(e => e.id !== entityId),
      isDirty: true
    }));
  },
  
  clearCompareEntities: () => {
    set({ compareEntities: [], isDirty: true });
  },
  
  updateCompareModeSettings: (settings) => {
    set((state) => ({
      compareModeSettings: { ...state.compareModeSettings, ...settings },
      isDirty: true
    }));
  },
  
  // Registry actions
  setMetricsRegistry: (metrics) => {
    set({ metricsRegistry: metrics });
  },
  
  setLoadingRegistry: (loading) => {
    set({ isLoadingRegistry: loading });
  },
  
  // UI actions
  setAddWidgetModalOpen: (isOpen) => {
    set({ isAddWidgetModalOpen: isOpen });
  },
  
  setViewManagerOpen: (isOpen) => {
    set({ isViewManagerOpen: isOpen });
  },
  
  setSelectedWidget: (widgetId) => {
    set({ selectedWidgetId: widgetId });
  },
  
  // Save current view
  saveCurrentView: async () => {
    const state = get();
    if (!state.currentView) return;
    
    await state.updateView(state.currentView.id, {
      widgets: state.widgets,
      filters: state.filters,
      compareMode: state.compareMode,
      compareEntities: state.compareEntities
    });
    
    set({ isDirty: false });
  },

  resetToSaved: () => {
    const currentView = get().currentView;
    if (!currentView) return;
    
    set({
      widgets: currentView.widgets,
      filters: currentView.filters,
      compareMode: currentView.compareMode,
      compareEntities: currentView.compareEntities,
      isDirty: false
    });
  },

  // Cache helpers
  getCachedMetric: (key: string) => get().metricsCache[key]?.data,
  setCachedMetric: (key: string, data: any) => set((state) => ({
    metricsCache: { ...state.metricsCache, [key]: { data, fetchedAt: Date.now() } }
  })),
})); 