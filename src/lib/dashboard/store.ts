import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { 
  DashboardView, 
  DashboardWidget, 
  DashboardFilters, 
  CompareEntity,
  MetricDefinition,
  ViewScope 
} from './types';

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
  
  // Metrics registry
  metricsRegistry: MetricDefinition[];
  isLoadingRegistry: boolean;
  
  // UI state
  isAddWidgetModalOpen: boolean;
  isViewManagerOpen: boolean;
  isDirty: boolean; // Track unsaved changes
  
  // Actions
  setCurrentView: (view: DashboardView) => void;
  setViews: (views: DashboardView[]) => void;
  createView: (name: string, scope: ViewScope, notes?: string) => Promise<void>;
  updateView: (viewId: string, updates: Partial<DashboardView>) => Promise<void>;
  deleteView: (viewId: string) => Promise<void>;
  duplicateView: (viewId: string, newName: string) => Promise<void>;
  
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
  
  // Registry actions
  setMetricsRegistry: (metrics: MetricDefinition[]) => void;
  
  // UI actions
  setAddWidgetModalOpen: (isOpen: boolean) => void;
  setViewManagerOpen: (isOpen: boolean) => void;
  setSelectedWidget: (widgetId: string | null) => void;
  
  // Save/Load
  saveCurrentView: () => Promise<void>;
  loadView: (viewId: string) => Promise<void>;
  resetToSaved: () => void;
}

export const useDashboardStore = create<DashboardState>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentView: null,
      views: [],
      isLoadingViews: false,
      widgets: [],
      selectedWidgetId: null,
      filters: {},
      compareMode: false,
      compareEntities: [],
      metricsRegistry: [],
      isLoadingRegistry: false,
      isAddWidgetModalOpen: false,
      isViewManagerOpen: false,
      isDirty: false,
      
      // View actions
      setCurrentView: (view) => set({ 
        currentView: view,
        widgets: view.widgets,
        filters: view.filters,
        compareMode: view.compareMode,
        compareEntities: view.compareEntities,
        isDirty: false
      }),
      
      setViews: (views) => set({ views }),
      
      createView: async (name, scope, notes) => {
        // This will be implemented with API call
        console.log('Creating view:', { name, scope, notes });
      },
      
      updateView: async (viewId, updates) => {
        // This will be implemented with API call
        console.log('Updating view:', { viewId, updates });
      },
      
      deleteView: async (viewId) => {
        // This will be implemented with API call
        console.log('Deleting view:', viewId);
      },
      
      duplicateView: async (viewId, newName) => {
        // This will be implemented with API call
        console.log('Duplicating view:', { viewId, newName });
      },
      
      // Widget actions
      addWidget: (widget) => {
        const newWidget = {
          ...widget,
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
        
        const newWidget = {
          ...widget,
          id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          position: {
            x: (widget.position.x + widget.size.w) % 12,
            y: widget.position.y
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
      
      // Registry actions
      setMetricsRegistry: (metrics) => {
        set({ metricsRegistry: metrics });
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
      
      // Save/Load
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
      
      loadView: async (viewId) => {
        // This will be implemented with API call
        console.log('Loading view:', viewId);
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
      }
    }),
    {
      name: 'dashboard-store'
    }
  )
); 