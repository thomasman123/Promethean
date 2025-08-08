export type VizType = 'kpi' | 'line' | 'bar' | 'area' | 'pie' | 'donut' | 'table' | 'funnel';
export type BreakdownType = 'total' | 'rep' | 'setter' | 'link' | 'time';
export type ViewScope = 'private' | 'team' | 'global';

export interface DashboardFilters {
  accountId?: string;
  startDate?: Date;
  endDate?: Date;
  repIds?: string[];
  setterIds?: string[];
}

export interface WidgetPosition {
  x: number;
  y: number;
}

export interface WidgetSize {
  w: number;
  h: number;
}

export interface WidgetSettings {
  title?: string;
  yAxisScale?: 'linear' | 'log';
  showRollingAvg?: boolean;
  rollingAvgDays?: number;
  compareVsPrevious?: boolean;
  previousPeriodType?: 'day' | 'week' | 'month' | 'year';
}

export interface DashboardWidget {
  id: string;
  metricName: string;
  breakdown: BreakdownType;
  vizType: VizType;
  settings?: WidgetSettings;
  position: WidgetPosition;
  size: WidgetSize;
  pinned?: boolean;
}

export interface CompareEntity {
  id: string;
  type: 'rep' | 'setter' | 'team' | 'account';
  name: string;
  color?: string;
}

export interface DashboardView {
  id: string;
  name: string;
  accountId: string;
  createdBy: string;
  scope: ViewScope;
  notes?: string;
  filters: DashboardFilters;
  widgets: DashboardWidget[];
  compareMode: boolean;
  compareEntities: CompareEntity[];
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MetricDefinition {
  name: string;
  displayName: string;
  description: string;
  category: string;
  supportedBreakdowns: BreakdownType[];
  recommendedVisualizations: VizType[];
  formula?: string;
  unit?: string;
}

export interface MetricData {
  metricName: string;
  breakdown: BreakdownType;
  data: any; // This will vary based on breakdown type
  metadata?: {
    totalCount?: number;
    aggregationType?: string;
    period?: string;
  };
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'rep' | 'setter' | 'admin' | 'super_admin';
}

// Grid layout specific types
export interface GridLayout {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  maxW?: number;
  minH?: number;
  maxH?: number;
  static?: boolean;
}

// API response types
export interface MetricsRegistryResponse {
  metrics: MetricDefinition[];
  categories: string[];
}

export interface MetricDataResponse {
  success: boolean;
  data: MetricData;
  error?: string;
}

export interface DashboardViewsResponse {
  views: DashboardView[];
  defaultViewId?: string;
} 