"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, ExternalLink, TrendingUp, TrendingDown } from "lucide-react";
import { KPIChart } from "./charts";
import { DashboardWidget as WidgetType, MetricData } from "@/lib/dashboard/types";
import { useDashboardStore } from "@/lib/dashboard/store";
import { cn } from "@/lib/utils";

interface WidgetDetailModalProps {
  widget: WidgetType;
  data: MetricData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WidgetDetailModal({ widget, data, open, onOpenChange }: WidgetDetailModalProps) {
  const { compareMode, compareEntities, metricsRegistry } = useDashboardStore();
  const metricDefinition = metricsRegistry.find(m => m.name === widget.metricName);
  
  // Get relevant entities for comparison
  const relevantEntities = compareMode 
    ? compareEntities.filter(e => {
        if (widget.breakdown === 'rep') return e.type === 'rep';
        if (widget.breakdown === 'setter') return e.type === 'setter';
        if (widget.breakdown === 'link') return true; // Both types relevant
        return false;
      })
    : [];

  const renderFullChart = () => {
    // Only KPI visualization is supported
    return (
      <div className="h-[400px] flex items-center justify-center">
        <KPIChart
          value={data.data.value}
          unit={metricDefinition?.unit}
          comparison={data.data.comparison}
        />
      </div>
    );
  };

  const renderComparisonKPI = () => {
    if (!compareMode || relevantEntities.length === 0) return null;
    const formatNumber = (n: number) => Math.round(n).toLocaleString();

    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {relevantEntities.slice(0, 4).map((entity, index) => {
          // For KPI, we show the single value for each entity
          const entityValue = typeof data.data.value === 'number' ? data.data.value : 0;
          return (
            <Card key={entity.id} className="p-4">
              <div className="text-2xl font-bold" style={{ color: entity.color }}>
                {formatNumber(entityValue)}
              </div>
              <div className="text-sm text-muted-foreground truncate">{entity.name}</div>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderTableData = () => {
    // For KPI widgets, show a simple summary
    const summary = [
      { label: 'Metric', value: metricDefinition?.displayName || widget.metricName },
      { label: 'Current Value', value: data.data.value?.toLocaleString() || 'N/A' },
      { label: 'Breakdown', value: widget.breakdown },
      { label: 'Visualization', value: 'KPI Number' }
    ];

    return (
      <Table>
        <TableHeader>
          <TableHead>Property</TableHead>
          <TableHead>Value</TableHead>
        </TableHeader>
        <TableBody>
          {summary.map((row, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium">{row.label}</TableCell>
              <TableCell>{row.value}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const handleExport = () => {
    const csvContent = `Metric,Value,Breakdown\n"${metricDefinition?.displayName || widget.metricName}","${data.data.value || 0}","${widget.breakdown}"`;
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
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {widget.settings?.title || metricDefinition?.displayName || widget.metricName}
            <Badge variant="secondary" className="text-xs">
              KPI Number
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {metricDefinition?.description}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="chart" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="chart">Chart</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="chart" className="space-y-4">
            {renderComparisonKPI()}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base">Full Size Chart</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleExport}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {renderFullChart()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
                <CardDescription>
                  Key information about this widget
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderTableData()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Widget Configuration</CardTitle>
                <CardDescription>
                  Current settings for this widget
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Title</label>
                    <div className="text-sm text-muted-foreground">
                      {widget.settings?.title || 'Auto-generated'}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Metric</label>
                    <div className="text-sm text-muted-foreground">
                      {metricDefinition?.displayName || widget.metricName}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Breakdown</label>
                    <div className="text-sm text-muted-foreground capitalize">
                      {widget.breakdown}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Visualization</label>
                    <div className="text-sm text-muted-foreground">
                      KPI Number
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
} 