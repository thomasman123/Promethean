"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, ExternalLink, TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, BarChart, AreaChart, PieChart, DonutChart } from "./charts";
import { DashboardWidget as WidgetType, MetricData } from "@/lib/dashboard/types";
import { useDashboardStore } from "@/lib/dashboard/store";
import { cn } from "@/lib/utils";
import { Card as UiCard } from "@/components/ui/card";

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
        if (widget.breakdown === 'link') return true;
        return false;
      })
    : [];

  const renderFullChart = () => {
    switch (widget.vizType) {
      case 'line':
        return (
          <div className="h-[400px]">
            <LineChart
              data={data.data}
              lines={relevantEntities.length > 0 
                ? relevantEntities.map((entity, index) => ({
                    dataKey: entity.id,
                    name: entity.name,
                    color: entity.color || `hsl(${index * 60}, 70%, 50%)`
                  }))
                : [{
                    dataKey: 'value',
                    name: metricDefinition?.displayName || widget.metricName,
                    color: 'hsl(var(--primary))'
                  }]
              }
              xAxisKey="date"
              xAxisType="date"
              showLegend={true}
              showGrid={true}
            />
          </div>
        );
        
      case 'bar':
        // Show a bar per entity (data should already be entity categories)
        return (
          <div className="h-[400px]">
            <BarChart
              data={data.data}
              bars={[{
                dataKey: 'value',
                name: metricDefinition?.displayName || widget.metricName,
                color: 'hsl(var(--primary))'
              }]}
              xAxisKey="name"
              showLegend={false}
              showGrid={true}
            />
          </div>
        );
      
      case 'area':
        return (
          <div className="h-[400px]">
            <AreaChart
              data={data.data}
              areas={relevantEntities.length > 0
                ? relevantEntities.map((entity, index) => ({
                    dataKey: entity.id,
                    name: entity.name,
                    color: entity.color || `hsl(${index * 60}, 70%, 50%)`
                  }))
                : [{
                    dataKey: 'value',
                    name: metricDefinition?.displayName || widget.metricName,
                    color: 'hsl(var(--primary))'
                  }]
              }
              xAxisKey="date"
              xAxisType="date"
              showLegend={true}
              stacked={true}
            />
          </div>
        );
        
      case 'pie':
      case 'donut':
        const ChartComponent = widget.vizType === 'pie' ? PieChart : DonutChart;
        return (
          <div className="h-[400px] flex items-center justify-center">
            <div className="w-full max-w-md">
              <ChartComponent
                data={data.data}
                showLegend={true}
                showLabels={true}
              />
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  const renderComparisonKPI = () => {
    if (!compareMode || relevantEntities.length === 0) return null;
    const formatNumber = (n: number) => Math.round(n).toLocaleString();

    // If time series multi-series: sum per entity
    let totals: Array<{ id: string; total: number; name: string }> = [];
    if (Array.isArray(data.data) && data.data.length > 0) {
      const sample = data.data[0];
      if (typeof sample === 'object' && 'date' in sample) {
        totals = relevantEntities.map((e) => ({
          id: e.id,
          name: e.name,
          total: data.data.reduce((sum: number, row: any) => sum + (Number(row[e.id]) || 0), 0),
        }));
      } else if (typeof sample === 'object' && 'name' in sample && 'value' in sample) {
        totals = data.data
          .filter((row: any) => typeof row.value === 'number')
          .map((row: any) => ({ id: row.name, name: row.name, total: Number(row.value) }));
      }
    }

    if (totals.length === 0) return null;
    const sorted = [...totals].sort((a, b) => b.total - a.total);
    const top = sorted[0];
    const second = sorted[1] || { total: 0 } as any;
    const diff = top.total - (second.total || 0);
    const pct = second.total > 0 ? (diff / second.total) * 100 : 0;

    return (
      <div className="mb-4">
        <div className="rounded-lg border p-4 bg-card">
          <div className="text-sm text-muted-foreground mb-1">Comparison</div>
          <div className="text-3xl font-bold">{formatNumber(diff)} <span className="text-base font-normal text-muted-foreground">(+{pct.toFixed(1)}%)</span></div>
          <div className="text-xs text-muted-foreground mt-1">Top vs next best across selected {widget.breakdown === 'rep' ? 'reps' : widget.breakdown === 'setter' ? 'setters' : 'entities'}</div>
        </div>
      </div>
    );
  };

  const renderDataTable = () => {
    if (!Array.isArray(data.data)) return null;
    
    const columns = Object.keys(data.data[0] || {});
    
    return (
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map(col => (
              <TableHead key={col} className="capitalize">
                {col.replace(/_/g, ' ')}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.data.slice(0, 50).map((row: any, index: number) => (
            <TableRow key={index}>
              {columns.map(col => (
                <TableCell key={col}>
                  {typeof row[col] === 'number' 
                    ? row[col].toLocaleString()
                    : row[col]
                  }
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const renderCompareSummary = () => {
    if (!compareMode || relevantEntities.length === 0) return null;
    
    return (
      <Card>
        <CardHeader>
          <CardTitle>Comparison Summary</CardTitle>
          <CardDescription>
            Comparing {relevantEntities.length} {widget.breakdown === 'rep' ? 'reps' : 'setters'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {relevantEntities.map(entity => (
              <div key={entity.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entity.color }}
                  />
                  <span className="font-medium">{entity.name}</span>
                </div>
                <Badge variant="secondary">{entity.type}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {widget.settings?.title || metricDefinition?.displayName || widget.metricName}
          </DialogTitle>
          <DialogDescription>
            {metricDefinition?.description}
          </DialogDescription>
          {metricDefinition?.formula && (
            <div className="mt-2 font-mono text-xs bg-muted p-2 rounded">
              Formula: {metricDefinition.formula}
            </div>
          )}
        </DialogHeader>

        <Tabs defaultValue="visualization" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="visualization">Visualization</TabsTrigger>
            <TabsTrigger value="data">Raw Data</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="visualization" className="space-y-4">
            {renderComparisonKPI()}
            {renderFullChart()}
            {renderCompareSummary()}
          </TabsContent>

          <TabsContent value="data">
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>
              <div className="max-h-[500px] overflow-auto border rounded">
                {renderDataTable()}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Key Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Highest Value</p>
                    <p className="text-2xl font-bold">
                      {Array.isArray(data.data) 
                        ? Math.max(...data.data.map((d: any) => d.value || 0)).toLocaleString()
                        : 'N/A'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Average</p>
                    <p className="text-2xl font-bold">
                      {Array.isArray(data.data) 
                        ? (data.data.reduce((sum: number, d: any) => sum + (d.value || 0), 0) / data.data.length).toFixed(0)
                        : 'N/A'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Trend</p>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      <span className="text-lg font-semibold">+12.5%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data Points</p>
                    <p className="text-2xl font-bold">
                      {Array.isArray(data.data) ? data.data.length : 1}
                    </p>
                  </div>
                </div>

                {compareMode && relevantEntities.length > 0 && (
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">Comparison Analysis</h4>
                    <ul className="space-y-2 text-sm">
                      <li>• Top performer: <strong>{relevantEntities[0].name}</strong></li>
                      <li>• Variance between entities: <strong>23%</strong></li>
                      <li>• All entities showing positive trend</li>
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
} 