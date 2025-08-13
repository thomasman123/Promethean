"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download } from "lucide-react";
import { KPIChart, BarChart, LineChart, AreaChart, RadarChart } from "./charts";
import { DashboardWidget as WidgetType, MetricData } from "@/lib/dashboard/types";
import { useDashboardStore } from "@/lib/dashboard/store";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Progress } from "@/components/ui/progress";

interface WidgetDetailModalProps {
  widget: WidgetType;
  data: MetricData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WidgetDetailModal({ widget, data, open, onOpenChange }: WidgetDetailModalProps) {
  const { metricsRegistry } = useDashboardStore();
  const metricDefinition = metricsRegistry.find(m => m.name === widget.metricName);
  const { selectedAccountId } = useAuth();

  const [actor, setActor] = useState<'rep' | 'setter'>('rep');
  const [grouped, setGrouped] = useState<Array<{ name: string; value: number }>>([]);

  // Multi-line chart state
  const [multiData, setMultiData] = useState<Array<Record<string, any>>>([]);
  const [multiLines, setMultiLines] = useState<Array<{ dataKey: string; name: string }>>([]);
  const [isLoadingSeries, setIsLoadingSeries] = useState(false);
  const [showReps, setShowReps] = useState(true);
  const [showSetters, setShowSetters] = useState(true);

  // Leaders (totals) lists
  const [repLeaders, setRepLeaders] = useState<Array<{ id: string; name: string; value: number }>>([]);
  const [setterLeaders, setSetterLeaders] = useState<Array<{ id: string; name: string; value: number }>>([]);

  const { filters: globalFilters } = useDashboardStore();

  const formatLocalYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const resolveDates = () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startDate = globalFilters.startDate ? (globalFilters.startDate instanceof Date ? globalFilters.startDate : new Date(globalFilters.startDate)) : thirtyDaysAgo;
    const endDate = globalFilters.endDate ? (globalFilters.endDate instanceof Date ? globalFilters.endDate : new Date(globalFilters.endDate)) : now;
    return { start: formatLocalYMD(startDate), end: formatLocalYMD(endDate) };
  };

  const getEngineMetricName = (dashboardMetricName: string, breakdown: string) => {
    if (dashboardMetricName.includes('appointment')) {
      if (breakdown === 'total') return 'total_appointments';
      if (breakdown === 'rep') return 'total_appointments_reps';
      if (breakdown === 'setter') return 'total_appointments_setters';
      if (breakdown === 'link') return 'appointments_link';
    }
    return dashboardMetricName;
  };

  // Fetch time series for both reps and setters concurrently and build a combined multi-line dataset
  useEffect(() => {
    const loadMultiSeries = async () => {
      if (!open) return;
      if (!selectedAccountId) return;
      if (!['line', 'bar', 'area'].includes(widget.vizType)) return;

      setIsLoadingSeries(true);
      try {
        const candidatesRes = await fetch(`/api/team/candidates?accountId=${encodeURIComponent(selectedAccountId)}`);
        const candidatesJson = await candidatesRes.json();

        const selectedRepIds: string[] = (globalFilters as any)?.repIds || [];
        const selectedSetterIds: string[] = (globalFilters as any)?.setterIds || [];

        const MAX_PER_GROUP = 6;
        const allReps = candidatesJson.reps || [];
        const allSetters = candidatesJson.setters || [];

        const reps = (selectedRepIds.length > 0
          ? allReps.filter((r: any) => selectedRepIds.includes(r.id))
          : allReps
        ).slice(0, MAX_PER_GROUP);

        const setters = (selectedSetterIds.length > 0
          ? allSetters.filter((s: any) => selectedSetterIds.includes(s.id))
          : allSetters
        ).slice(0, MAX_PER_GROUP);

        const { start, end } = resolveDates();
        const baseFilters = { dateRange: { start, end }, accountId: selectedAccountId } as any;
        const engineMetricName = getEngineMetricName(widget.metricName, 'total');

        const seriesByKey: Record<string, { name: string; points: Array<{ date: string; value: number }> }> = {};
        const fetchForEntity = async (entity: any, type: 'rep' | 'setter') => {
          const filters = { ...baseFilters } as any;
          if (type === 'rep') filters.repIds = [entity.id];
          if (type === 'setter') filters.setterIds = [entity.id];
          const resp = await fetch('/api/metrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ metricName: engineMetricName, filters, vizType: 'line', breakdown: 'total' })
          });
          if (!resp.ok) return;
          const json = await resp.json();
          const ts = (json?.result?.type === 'time' && Array.isArray(json?.result?.data)) ? json.result.data as Array<{ date: string; value: number }> : [];
          const safeKey = `${type}-${slugify(entity.name || entity.id)}`;
          seriesByKey[safeKey] = { name: `${entity.name || 'Unknown'}`, points: ts };
        };

        await Promise.all([
          ...(showReps ? reps.map((r: any) => fetchForEntity(r, 'rep')) : []),
          ...(showSetters ? setters.map((s: any) => fetchForEntity(s, 'setter')) : []),
        ]);

        const allDates = new Set<string>();
        Object.values(seriesByKey).forEach(s => s.points.forEach(p => allDates.add(p.date)));
        const dates = Array.from(allDates);

        const combined = dates.map(date => {
          const row: Record<string, any> = { date };
          for (const [key, s] of Object.entries(seriesByKey)) {
            const found = s.points.find(p => p.date === date);
            row[key] = found?.value || 0;
          }
          return row;
        });

        const lines = Object.entries(seriesByKey).map(([key, s]) => ({ dataKey: key, name: s.name }));

        setMultiData(combined);
        setMultiLines(lines);
      } finally {
        setIsLoadingSeries(false);
      }
    };

    loadMultiSeries();
  }, [open, widget.vizType, widget.metricName, selectedAccountId, showReps, showSetters, (globalFilters as any)?.repIds, (globalFilters as any)?.setterIds]);

  // Leaders (totals) fetch — sums the time series to totals per entity
  useEffect(() => {
    const loadLeaders = async () => {
      if (!open) return;
      if (!selectedAccountId) return;

      const candidatesRes = await fetch(`/api/team/candidates?accountId=${encodeURIComponent(selectedAccountId)}`);
      const candidatesJson = await candidatesRes.json();

      const selectedRepIds: string[] = (globalFilters as any)?.repIds || [];
      const selectedSetterIds: string[] = (globalFilters as any)?.setterIds || [];

      const MAX_PER_GROUP = 8;
      const allReps = candidatesJson.reps || [];
      const allSetters = candidatesJson.setters || [];

      const reps = (selectedRepIds.length > 0
        ? allReps.filter((r: any) => selectedRepIds.includes(r.id))
        : allReps
      ).slice(0, MAX_PER_GROUP);

      const setters = (selectedSetterIds.length > 0
        ? allSetters.filter((s: any) => selectedSetterIds.includes(s.id))
        : allSetters
      ).slice(0, MAX_PER_GROUP);

      const { start, end } = resolveDates();
      const baseFilters = { dateRange: { start, end }, accountId: selectedAccountId } as any;
      const engineMetricName = getEngineMetricName(widget.metricName, 'total');

      const fetchTotal = async (entity: any, type: 'rep' | 'setter') => {
        const filters = { ...baseFilters } as any;
        if (type === 'rep') filters.repIds = [entity.id];
        if (type === 'setter') filters.setterIds = [entity.id];
        const resp = await fetch('/api/metrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metricName: engineMetricName, filters, vizType: 'line', breakdown: 'total' })
        });
        if (!resp.ok) return { id: entity.id, name: entity.name || 'Unknown', value: 0 };
        const json = await resp.json();
        const ts = (json?.result?.type === 'time' && Array.isArray(json?.result?.data)) ? json.result.data as Array<{ date: string; value: number }> : [];
        const total = ts.reduce((s, p) => s + (p.value || 0), 0);
        return { id: entity.id, name: entity.name || 'Unknown', value: total };
      };

      const [repTotals, setterTotals] = await Promise.all([
        Promise.all(reps.map((r: any) => fetchTotal(r, 'rep'))),
        Promise.all(setters.map((s: any) => fetchTotal(s, 'setter')))
      ]);

      setRepLeaders(repTotals.sort((a, b) => b.value - a.value));
      setSetterLeaders(setterTotals.sort((a, b) => b.value - a.value));
    };

    loadLeaders();
  }, [open, selectedAccountId, (globalFilters as any)?.repIds, (globalFilters as any)?.setterIds]);

  useEffect(() => {
    if (!open) return;
    if (Array.isArray((data as any).data)) {
      const series = (data as any).data as Array<{ date: string; value: number }>;
      const total = series.reduce((s, p) => s + (p.value || 0), 0);
      setGrouped([
        { name: actor === 'rep' ? 'Rep A' : 'Setter A', value: Math.round(total * 0.6) },
        { name: actor === 'rep' ? 'Rep B' : 'Setter B', value: Math.round(total * 0.3) },
        { name: actor === 'rep' ? 'Rep C' : 'Setter C', value: Math.max(0, total - Math.round(total * 0.9)) },
      ]);
    } else {
      const total = (data as any).data?.value || 0;
      setGrouped([
        { name: actor === 'rep' ? 'Rep A' : 'Setter A', value: Math.round(total * 0.6) },
        { name: actor === 'rep' ? 'Rep B' : 'Setter B', value: Math.round(total * 0.3) },
        { name: actor === 'rep' ? 'Rep C' : 'Setter C', value: Math.max(0, total - Math.round(total * 0.9)) },
      ]);
    }
  }, [open, actor, data]);

  const renderFullChart = () => {
    const isSeries = Array.isArray((data as any).data);
    const series = isSeries ? (data as any).data as Array<{ date: string; value: number }> : [];

    switch (widget.vizType) {
      case 'line':
        return (
          <div className="h-[70vh] w-full">
            <LineChart
              data={series.length ? series.map(d => ({ date: d.date, value: d.value })) : [{ date: 'Current', value: (data as any).data.value || 0 }]}
              lines={[{ dataKey: 'value', name: metricDefinition?.displayName || widget.metricName, color: 'var(--primary)' }]}
              xAxisKey="date"
              showLegend={false}
              showGrid
              className="h-full w-full"
            />
          </div>
        );
      case 'bar':
        return (
          <div className="h-[70vh] w-full">
            <BarChart
              data={series.length ? series.map(d => ({ date: d.date, value: d.value })) : [{ date: 'Current', value: (data as any).data.value || 0 }]}
              bars={[{ dataKey: 'value', name: metricDefinition?.displayName || widget.metricName, color: 'var(--primary)' }]}
              xAxisKey="date"
              showLegend={false}
              showGrid
              className="h-full w-full"
            />
          </div>
        );
      case 'area':
        return (
          <div className="h-[70vh] w-full">
            <AreaChart
              data={series.length ? series.map(d => ({ date: d.date, value: d.value })) : [{ date: 'Current', value: (data as any).data.value || 0 }]}
              areas={[{ dataKey: 'value', name: metricDefinition?.displayName || widget.metricName, color: 'var(--primary)' }]}
              xAxisKey="date"
              showLegend={false}
              showGrid
              className="h-full w-full"
            />
          </div>
        );
      case 'radar':
        return (
          <div className="h-[70vh] w-full">
            <RadarChart
              data={series.length ? series.map(d => ({ date: d.date, value: d.value })) : [{ date: 'Current', value: (data as any).data.value || 0 }]}
              radarSeries={[{ dataKey: 'value', name: metricDefinition?.displayName || widget.metricName, color: 'var(--primary)' }]}
              angleKey="date"
              showLegend={false}
              disableTooltip={false}
              className="h-full w-full"
            />
          </div>
        );
      case 'kpi':
      default:
        return (
          <div className="h-[70vh] w-full flex items-center justify-center">
            <KPIChart value={(data as any).data.value} unit={metricDefinition?.unit} comparison={(data as any).data.comparison} />
          </div>
        );
    }
  };

  const LeadersList = ({ title, items }: { title: string; items: Array<{ name: string; value: number }> }) => {
    const total = Math.max(1, items.reduce((s, i) => s + i.value, 0));
    const top = Math.max(1, items[0]?.value || 1);
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>Comparison within group</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item, idx) => {
            const pctOfTotal = (item.value / total) * 100;
            const pctOfTop = (item.value / top) * 100;
            return (
              <div key={item.name} className="rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium truncate">{idx + 1}. {item.name}</div>
                  <div className="text-sm tabular-nums font-mono">{item.value.toLocaleString()}</div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground flex items-center justify-between">
                  <span>{pctOfTotal.toFixed(1)}% of total</span>
                  <span>{pctOfTop.toFixed(1)}% of top</span>
                </div>
                <div className="mt-2">
                  <Progress value={pctOfTop} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  };

  const handleExport = () => {
    const csvContent = `Metric,Value,Breakdown\n"${metricDefinition?.displayName || widget.metricName}","${(data as any).data.value || 0}","${widget.breakdown}"`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${widget.metricName}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const memoLines = useMemo(() => multiLines, [multiLines]);
  const memoData = useMemo(() => multiData, [multiData]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] h-[90vh] max-w-[92vw] sm:max-w-[92vw] md:max-w-[92vw] lg:max-w-[92vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {widget.settings?.title || metricDefinition?.displayName || widget.metricName}
          </DialogTitle>
          <DialogDescription>
            {metricDefinition?.description}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="chart" className="w-full h-[calc(90vh-6rem)]">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chart">Chart</TabsTrigger>
            <TabsTrigger value="leaders">Leaders</TabsTrigger>
          </TabsList>

          <TabsContent value="chart" className="space-y-4 h-full">
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base">Full Size Chart</CardTitle>
                <div className="flex items-center gap-2">
                  {['line','bar','area'].includes(widget.vizType) && (
                    <>
                      <Button size="sm" variant={showReps ? 'default' : 'outline'} onClick={() => setShowReps(v => !v)}>Reps</Button>
                      <Button size="sm" variant={showSetters ? 'default' : 'outline'} onClick={() => setShowSetters(v => !v)}>Setters</Button>
                    </>
                  )}
                  <Button variant="outline" size="sm" onClick={handleExport}>Export</Button>
                </div>
              </CardHeader>
              <CardContent className="h-[calc(100%-3rem)]">
                {widget.vizType === 'line' && memoData.length > 0 ? (
                  <div className="h-full w-full">
                    <LineChart
                      data={memoData}
                      lines={memoLines.map((l, idx) => ({ dataKey: l.dataKey, name: l.name, color: `var(--chart-${(idx % 10) + 1})` }))}
                      xAxisKey="date"
                      showLegend
                      showGrid
                      className="h-full w-full"
                    />
                  </div>
                ) : widget.vizType === 'bar' && memoData.length > 0 ? (
                  <div className="h-full w-full">
                    <BarChart
                      data={memoData}
                      bars={memoLines.map((l, idx) => ({ dataKey: l.dataKey, name: l.name, color: `var(--chart-${(idx % 10) + 1})` }))}
                      xAxisKey="date"
                      showLegend
                      showGrid
                      className="h-full w-full"
                    />
                  </div>
                ) : widget.vizType === 'area' && memoData.length > 0 ? (
                  <div className="h-full w-full">
                    <AreaChart
                      data={memoData}
                      areas={memoLines.map((l, idx) => ({ dataKey: l.dataKey, name: l.name, color: `var(--chart-${(idx % 10) + 1})` }))}
                      xAxisKey="date"
                      showLegend
                      showGrid
                      className="h-full w-full"
                    />
                  </div>
                ) : (
                  renderFullChart()
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leaders" className="space-y-6 h-full overflow-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <LeadersList title="Sales Reps" items={repLeaders} />
              <LeadersList title="Setters" items={setterLeaders} />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
} 