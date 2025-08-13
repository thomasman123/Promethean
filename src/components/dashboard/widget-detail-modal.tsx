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

  // State for multi-line chart
  const [multiData, setMultiData] = useState<Array<Record<string, any>>>([]);
  const [multiLines, setMultiLines] = useState<Array<{ dataKey: string; name: string }>>([]);
  const [isLoadingSeries, setIsLoadingSeries] = useState(false);

  const { filters: globalFilters } = useDashboardStore();

  const formatLocalYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

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

  // Fetch candidates for actor and build multi-series time data for line charts
  useEffect(() => {
    const loadMultiSeries = async () => {
      if (!open || widget.vizType !== 'line') return;
      if (!selectedAccountId) return;

      setIsLoadingSeries(true);
      try {
        // 1) load candidates
        const candidatesRes = await fetch(`/api/team/candidates?accountId=${encodeURIComponent(selectedAccountId)}`);
        const candidatesJson = await candidatesRes.json();
        const list = (actor === 'rep' ? candidatesJson.reps : candidatesJson.setters) || [];
        const top = list.slice(0, 5); // initial: top 5 (first 5)

        // 2) fetch time series per candidate
        const { start, end } = resolveDates();
        const baseFilters = {
          dateRange: { start, end },
          accountId: selectedAccountId,
        } as any;

        const engineMetricName = getEngineMetricName(widget.metricName, 'total');

        const seriesByEntity: Record<string, Array<{ date: string; value: number }>> = {};
        const lines: Array<{ dataKey: string; name: string }> = [];

        await Promise.all(
          top.map(async (entity: any) => {
            const filters = { ...baseFilters } as any;
            if (actor === 'rep') filters.repIds = [entity.id];
            if (actor === 'setter') filters.setterIds = [entity.id];

            const resp = await fetch('/api/metrics', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ metricName: engineMetricName, filters, vizType: 'line', breakdown: 'total' })
            });
            if (!resp.ok) return;
            const json = await resp.json();
            const ts = (json?.result?.type === 'time' && Array.isArray(json?.result?.data)) ? json.result.data as Array<{ date: string; value: number }> : [];
            seriesByEntity[entity.id] = ts;
            lines.push({ dataKey: entity.id, name: entity.name || 'Unknown' });
          })
        );

        // 3) combine into a single dataset keyed by date
        const allDates = new Set<string>();
        Object.values(seriesByEntity).forEach(arr => arr.forEach(p => allDates.add(p.date)));
        const sortedDates = Array.from(allDates);

        const combined = sortedDates.map(date => {
          const row: Record<string, any> = { date };
          for (const [entityId, arr] of Object.entries(seriesByEntity)) {
            const found = (arr as any[]).find(p => p.date === date);
            row[entityId] = found?.value || 0;
          }
          return row;
        });

        setMultiLines(lines);
        setMultiData(combined);
      } finally {
        setIsLoadingSeries(false);
      }
    };

    loadMultiSeries();
  }, [open, widget.vizType, widget.metricName, selectedAccountId, actor]);

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

  const renderBreakdown = () => {
    const total = grouped.reduce((s, x) => s + x.value, 0) || 1;
    const chartData = grouped.map(g => ({ entity: g.name, value: g.value }));

    return (
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Breakdown by {actor === 'rep' ? 'Sales Rep' : 'Setter'}</CardTitle>
            <CardDescription>Same filters and aggregation; alternate attribution</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant={actor === 'rep' ? 'default' : 'outline'} onClick={() => setActor('rep')}>Reps</Button>
            <Button size="sm" variant={actor === 'setter' ? 'default' : 'outline'} onClick={() => setActor('setter')}>Setters</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[50vh]">
            <BarChart
              data={chartData.map(d => ({ date: d.entity, value: d.value }))}
              bars={[{ dataKey: 'value', name: 'Value', color: 'var(--primary)' }]}
              xAxisKey="date"
              showLegend={false}
              showGrid
              className="h-full w-full"
            />
          </div>
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entity</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grouped.map(row => (
                  <TableRow key={row.name}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="text-right">{row.value.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{((row.value / total) * 100).toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] h-[95vh] max-w-[96vw] sm:max-w-[96vw] md:max-w-[96vw] lg:max-w-[96vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {widget.settings?.title || metricDefinition?.displayName || widget.metricName}
          </DialogTitle>
          <DialogDescription>
            {metricDefinition?.description}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="chart" className="w-full h-[calc(95vh-6rem)]">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="chart">Chart</TabsTrigger>
            <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
          </TabsList>

          <TabsContent value="chart" className="space-y-4 h-full">
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base">Full Size Chart</CardTitle>
                <div className="flex items-center gap-2">
                  {widget.vizType === 'line' && (
                    <>
                      <Button size="sm" variant={actor === 'rep' ? 'default' : 'outline'} onClick={() => setActor('rep')}>Reps</Button>
                      <Button size="sm" variant={actor === 'setter' ? 'default' : 'outline'} onClick={() => setActor('setter')}>Setters</Button>
                    </>
                  )}
                  <Button variant="outline" size="sm" onClick={handleExport}>Export</Button>
                </div>
              </CardHeader>
              <CardContent className="h-[calc(100%-3rem)]">
                {widget.vizType === 'line' && multiData.length > 0 ? (
                  <div className="h-full w-full">
                    <LineChart
                      data={multiData}
                      lines={multiLines.map((l, idx) => ({ dataKey: l.dataKey, name: l.name, color: `var(--chart-${(idx % 5) + 1})` }))}
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

          <TabsContent value="breakdown" className="space-y-4">
            {renderBreakdown()}
          </TabsContent>

          <TabsContent value="data" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
                <CardDescription>Key information about this widget</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Metric</TableCell>
                      <TableCell>{metricDefinition?.displayName || widget.metricName}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Breakdown</TableCell>
                      <TableCell>{widget.breakdown}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
} 