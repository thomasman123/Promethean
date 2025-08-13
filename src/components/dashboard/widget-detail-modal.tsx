"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import { KPIChart, BarChart } from "./charts";
import { DashboardWidget as WidgetType, MetricData } from "@/lib/dashboard/types";
import { useDashboardStore } from "@/lib/dashboard/store";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";

interface WidgetDetailModalProps {
  widget: WidgetType;
  data: MetricData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WidgetDetailModal({ widget, data, open, onOpenChange }: WidgetDetailModalProps) {
  const { metricsRegistry } = useDashboardStore();
  const metricDefinition = metricsRegistry.find(m => m.name === widget.metricName);

  const [actor, setActor] = useState<'rep' | 'setter'>('rep');
  const [grouped, setGrouped] = useState<Array<{ name: string; value: number }>>([]);

  useEffect(() => {
    // Placeholder grouped data; API wiring will replace this
    if (!open) return;
    // Create a faux breakdown from the current value or series
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
    return (
      <div className="h-[400px] flex items-center justify-center">
        {Array.isArray((data as any).data) ? (
          <BarChart
            data={(data as any).data.map((d: any) => ({ date: d.date, value: d.value }))}
            bars={[{ dataKey: 'value', name: metricDefinition?.displayName || widget.metricName, color: 'var(--primary)' }]}
            xAxisKey="date"
            showLegend={false}
            showGrid
            className="h-[360px] w-full"
          />
        ) : (
          <KPIChart value={(data as any).data.value} unit={metricDefinition?.unit} comparison={(data as any).data.comparison} />
        )}
      </div>
    );
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
          <div className="h-[320px]">
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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {widget.settings?.title || metricDefinition?.displayName || widget.metricName}
          </DialogTitle>
          <DialogDescription>
            {metricDefinition?.description}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="chart" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="chart">Chart</TabsTrigger>
            <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
          </TabsList>

          <TabsContent value="chart" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base">Full Size Chart</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleExport}>Export</Button>
                </div>
              </CardHeader>
              <CardContent>{renderFullChart()}</CardContent>
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