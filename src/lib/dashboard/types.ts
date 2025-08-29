export type VizType = 'kpi' | 'line' | 'bar' | 'area' | 'radar';
export type BreakdownType = 'total' | 'rep' | 'setter' | 'link' | 'time';
export type ViewScope = 'private' | 'team' | 'global';

export interface DashboardFilters {
  accountId?: string;
  startDate?: Date;
  endDate?: Date;
  repIds?: string[];
  setterIds?: string[];
  // Advanced attribution filters
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
}

export interface WidgetPosition {
  x: number;
  y: number;
}

export interface WidgetSize {
  w: number;
  h: number;
}

export type BusinessHourMapping = {
  countryCode: string;          // "+1", "+61", etc.
  tz: string;                   // IANA timezone like "America/New_York"
  startLocal: string;           // "08:00"
  endLocal: string;             // "18:00"
};

export interface WidgetSettings {
  title?: string;
  yAxisScale?: 'linear' | 'log';
  showRollingAvg?: boolean;
  rollingAvgDays?: number;
  compareVsPrevious?: boolean;
  previousPeriodType?: 'day' | 'week' | 'month' | 'year';
  cumulative?: boolean;
  bookingLeadTimeCalculation?: 'average' | 'median';
  speedToLeadCalculation?: 'average' | 'median';
  speedToLeadTimeFormat?: boolean; // Show as human-readable time format
  speedToLeadBusinessHours?: BusinessHourMapping[]; // Business hours by country code
  metricColors?: Record<string, string>; // metricName -> color
}

export interface DashboardWidget {
  id: string;
  // Primary metric for backwards compatibility
  metricName: string;
  // Optional: multiple metrics for comparison (non-KPI visualizations)
  metricNames?: string[];
  breakdown: BreakdownType;
  vizType: VizType;
  settings?: WidgetSettings;
  position: WidgetPosition;
  size: WidgetSize;
  pinned?: boolean;
}

export type CompareScope = 'setter' | 'rep' | 'pair';
export type AttributionMode = 'primary' | 'last-touch' | 'assist';

export interface CompareEntity {
  id: string;
  type: 'rep' | 'setter' | 'team' | 'account';
  name: string;
  color?: string;
}

export interface CompareModeSettings {
  scope: CompareScope;
  attributionMode: AttributionMode;
  excludeInCallDials: boolean;
  excludeRepDials: boolean;
}

export interface SetterRepPair {
  setterId: string;
  setterName: string;
  repId: string;
  repName: string;
  metrics?: Record<string, any>;
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