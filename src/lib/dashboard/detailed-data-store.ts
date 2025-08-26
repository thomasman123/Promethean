"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DateRange } from 'react-day-picker';

export type ViewMode = 'aggregated' | 'unaggregated';
export type GroupBy = 'date' | 'week' | 'month' | 'setter' | 'closer' | 'team' | 'offer';
export type RecordType = 'appointments' | 'dials' | 'deals' | 'payments' | 'leads';
export type DateBasis = 'booked_at' | 'ended_at' | 'closed_at' | 'paid_at' | 'created_at';

export interface DetailedDataFilters {
  dateRange?: DateRange;
  repIds?: string[];
  setterIds?: string[];
  offer?: string[];
  pipeline?: string[];
  source?: string[];
  status?: string[];
  stage?: string[];
  outcome?: string[];
  tags?: string[];
  // Data hygiene filters
  showUnmapped?: boolean;
  showMissingOwner?: boolean;
}

export interface ColumnConfig {
  id: string;
  visible: boolean;
  width?: number;
  pinned?: 'left' | 'right' | false;
  order: number;
}

export interface ComputedColumn {
  id: string;
  name: string;
  formula: string;
  inputs: string[];
  type: 'ratio' | 'sum' | 'average' | 'rolling' | 'cumulative';
}

export interface SavedView {
  id: string;
  name: string;
  description?: string;
  scope: 'private' | 'team' | 'global';
  filters: DetailedDataFilters;
  viewMode: ViewMode;
  groupBy: GroupBy;
  recordType: RecordType;
  columns: ColumnConfig[];
  computedColumns: ComputedColumn[];
  sortBy?: { id: string; desc: boolean }[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface DetailedDataState {
  // View state
  viewMode: ViewMode;
  groupBy: GroupBy;
  recordType: RecordType;
  dateBasis: DateBasis;
  
  // Filters
  filters: DetailedDataFilters;
  
  // Table configuration
  columns: ColumnConfig[];
  computedColumns: ComputedColumn[];
  sortBy: { id: string; desc: boolean }[];
  pageSize: number;
  currentPage: number;
  
  // UI state
  isFilterDrawerOpen: boolean;
  isDrilldownOpen: boolean;
  drilldownData: any | null;
  selectedRows: string[];
  
  // Saved views
  savedViews: SavedView[];
  currentViewId?: string;
  
  // Comparison
  compareMode: boolean;
  compareEntity?: { type: 'period' | 'entity'; value: any };
  
  // Actions
  setViewMode: (mode: ViewMode) => void;
  setGroupBy: (groupBy: GroupBy) => void;
  setRecordType: (type: RecordType) => void;
  setFilters: (filters: Partial<DetailedDataFilters>) => void;
  clearFilters: () => void;
  
  // Column actions
  toggleColumn: (columnId: string) => void;
  reorderColumns: (startIndex: number, endIndex: number) => void;
  pinColumn: (columnId: string, position: 'left' | 'right' | false) => void;
  addComputedColumn: (column: Omit<ComputedColumn, 'id'>) => void;
  removeComputedColumn: (columnId: string) => void;
  
  // Table actions
  setSortBy: (sortBy: { id: string; desc: boolean }[]) => void;
  setPageSize: (size: number) => void;
  setCurrentPage: (page: number) => void;
  
  // UI actions
  toggleFilterDrawer: () => void;
  openDrilldown: (data: any) => void;
  closeDrilldown: () => void;
  selectRows: (rowIds: string[]) => void;
  
  // View management
  saveView: (view: Omit<SavedView, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  loadView: (viewId: string) => void;
  deleteView: (viewId: string) => Promise<void>;
  
  // Comparison
  toggleCompareMode: () => void;
  setCompareEntity: (entity: { type: 'period' | 'entity'; value: any } | undefined) => void;
  
  // Utilities
  getDateBasisForRecordType: (type: RecordType) => DateBasis;
  resetToDefaults: () => void;
}

const defaultColumns: Record<RecordType, ColumnConfig[]> = {
  appointments: [
    { id: 'contact_name', visible: true, order: 0, pinned: 'left' },
    { id: 'setter_name', visible: true, order: 1 },
    { id: 'status', visible: true, order: 2 },
    { id: 'booked_at', visible: true, order: 3 },
    { id: 'source', visible: true, order: 4 },
    { id: 'show_outcome', visible: true, order: 5 },
    { id: 'notes', visible: true, order: 6 },
  ],
  dials: [
    { id: 'dialed_at', visible: true, order: 0, pinned: 'left' },
    { id: 'contact_name', visible: true, order: 1 },
    { id: 'duration', visible: true, order: 2 },
    { id: 'outcome', visible: true, order: 3 },
    { id: 'setter_name', visible: true, order: 4 },
  ],
  deals: [
    { id: 'deal_name', visible: true, order: 0, pinned: 'left' },
    { id: 'stage', visible: true, order: 1 },
    { id: 'amount', visible: true, order: 2 },
    { id: 'closed_at', visible: true, order: 3 },
    { id: 'closer_name', visible: true, order: 4 },
    { id: 'won_lost_reason', visible: true, order: 5 },
  ],
  payments: [
    { id: 'paid_at', visible: true, order: 0, pinned: 'left' },
    { id: 'amount', visible: true, order: 1 },
    { id: 'method', visible: true, order: 2 },
    { id: 'deal_name', visible: true, order: 3 },
    { id: 'refund_flag', visible: true, order: 4 },
  ],
  leads: [
    { id: 'created_at', visible: true, order: 0, pinned: 'left' },
    { id: 'name', visible: true, order: 1 },
    { id: 'email', visible: true, order: 2 },
    { id: 'source', visible: true, order: 3 },
    { id: 'status', visible: true, order: 4 },
  ],
};

export const useDetailedDataStore = create<DetailedDataState>()(
  persist(
    (set, get) => ({
      // Initial state
      viewMode: 'aggregated',
      groupBy: 'date',
      recordType: 'appointments',
      dateBasis: 'booked_at',
      filters: {},
      columns: defaultColumns.appointments,
      computedColumns: [],
      sortBy: [],
      pageSize: 50,
      currentPage: 1,
      isFilterDrawerOpen: false,
      isDrilldownOpen: false,
      drilldownData: null,
      selectedRows: [],
      savedViews: [],
      currentViewId: undefined,
      compareMode: false,
      compareEntity: undefined,

      // Actions
      setViewMode: (mode) => set({ viewMode: mode }),
      setGroupBy: (groupBy) => set({ groupBy }),
      setRecordType: (type) => set({ 
        recordType: type, 
        columns: defaultColumns[type],
        dateBasis: get().getDateBasisForRecordType(type),
      }),
      
      setFilters: (filters) => set((state) => ({
        filters: { ...state.filters, ...filters },
      })),
      
      clearFilters: () => set({ filters: {} }),
      
      toggleColumn: (columnId) => set((state) => ({
        columns: state.columns.map((col) =>
          col.id === columnId ? { ...col, visible: !col.visible } : col
        ),
      })),
      
      reorderColumns: (startIndex, endIndex) => set((state) => {
        const result = Array.from(state.columns);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        return {
          columns: result.map((col, index) => ({ ...col, order: index })),
        };
      }),
      
      pinColumn: (columnId, position) => set((state) => ({
        columns: state.columns.map((col) =>
          col.id === columnId ? { ...col, pinned: position } : col
        ),
      })),
      
      addComputedColumn: (column) => set((state) => ({
        computedColumns: [
          ...state.computedColumns,
          { ...column, id: `computed_${Date.now()}` },
        ],
      })),
      
      removeComputedColumn: (columnId) => set((state) => ({
        computedColumns: state.computedColumns.filter((col) => col.id !== columnId),
      })),
      
      setSortBy: (sortBy) => set({ sortBy }),
      setPageSize: (size) => set({ pageSize: size, currentPage: 1 }),
      setCurrentPage: (page) => set({ currentPage: page }),
      
      toggleFilterDrawer: () => set((state) => ({
        isFilterDrawerOpen: !state.isFilterDrawerOpen,
      })),
      
      openDrilldown: (data) => set({ isDrilldownOpen: true, drilldownData: data }),
      closeDrilldown: () => set({ isDrilldownOpen: false, drilldownData: null }),
      
      selectRows: (rowIds) => set({ selectedRows: rowIds }),
      
      saveView: async (view) => {
        const newView: SavedView = {
          ...view,
          id: `view_${Date.now()}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        set((state) => ({
          savedViews: [...state.savedViews, newView],
          currentViewId: newView.id,
        }));
      },
      
      loadView: (viewId) => {
        const view = get().savedViews.find((v) => v.id === viewId);
        if (view) {
          set({
            currentViewId: viewId,
            viewMode: view.viewMode,
            groupBy: view.groupBy,
            recordType: view.recordType,
            filters: view.filters,
            columns: view.columns,
            computedColumns: view.computedColumns,
            sortBy: view.sortBy || [],
          });
        }
      },
      
      deleteView: async (viewId) => {
        set((state) => ({
          savedViews: state.savedViews.filter((v) => v.id !== viewId),
          currentViewId: state.currentViewId === viewId ? undefined : state.currentViewId,
        }));
      },
      
      toggleCompareMode: () => set((state) => ({
        compareMode: !state.compareMode,
        compareEntity: state.compareMode ? undefined : state.compareEntity,
      })),
      
      setCompareEntity: (entity) => set({ compareEntity: entity }),
      
      getDateBasisForRecordType: (type) => {
        const mapping: Record<RecordType, DateBasis> = {
          appointments: 'booked_at',
          dials: 'ended_at',
          deals: 'closed_at',
          payments: 'paid_at',
          leads: 'created_at',
        };
        return mapping[type];
      },
      
      resetToDefaults: () => set({
        viewMode: 'aggregated',
        groupBy: 'date',
        recordType: 'appointments',
        filters: {},
        columns: defaultColumns.appointments,
        computedColumns: [],
        sortBy: [],
        pageSize: 50,
        currentPage: 1,
        compareMode: false,
        compareEntity: undefined,
      }),
    }),
    {
      name: 'detailed-data-store',
      partialize: (state) => ({
        viewMode: state.viewMode,
        groupBy: state.groupBy,
        recordType: state.recordType,
        pageSize: state.pageSize,
        savedViews: state.savedViews,
      }),
    }
  )
); 