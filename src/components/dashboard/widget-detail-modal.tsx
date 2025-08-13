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
  const { metricsRegistry, compareMode, compareEntities } = useDashboardStore();
  
  const metricDefinition = metricsRegistry.find(m => m.name === widget.metricName);

  const renderFullChart = () => {
    // Only support KPI visualization now
    return (
      <div className="h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl font-bold text-primary mb-4">
            {data.data.value?.toLocaleString() || 0}
          </div>
          {data.data.comparison && (
            <div className={`text-2xl font-medium ${
              data.data.comparison.value > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {data.data.comparison.value > 0 ? '↗' : '↘'} {Math.abs(data.data.comparison.value)}%
            </div>
          )}
          {metricDefinition?.unit && (
            <div className="text-lg text-muted-foreground mt-2">
              {metricDefinition.unit}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDataTable = () => {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Metric</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Change</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">
                {widget.settings?.title || metricDefinition?.displayName || widget.metricName}
              </TableCell>
              <TableCell>
                {data.data.value?.toLocaleString() || 0}
                {metricDefinition?.unit && <span className="text-muted-foreground ml-1">{metricDefinition.unit}</span>}
              </TableCell>
              <TableCell>
                {data.data.comparison ? (
                  <div className={`flex items-center gap-1 ${
                    data.data.comparison.value > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {data.data.comparison.value > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    {Math.abs(data.data.comparison.value)}%
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {widget.settings?.title || metricDefinition?.displayName || widget.metricName}
            <Badge variant="secondary" className="text-xs">
              KPI
            </Badge>
          </DialogTitle>
          {metricDefinition?.description && (
            <DialogDescription>{metricDefinition.description}</DialogDescription>
          )}
        </DialogHeader>

        <Tabs defaultValue="visualization" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="visualization">Visualization</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="visualization" className="flex-1 overflow-auto">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Full View</CardTitle>
                    <CardDescription>Detailed view of your metric</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {renderFullChart()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data" className="flex-1 overflow-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Raw Data</CardTitle>
                <CardDescription>View the underlying data for this metric</CardDescription>
              </CardHeader>
              <CardContent>
                {renderDataTable()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="flex-1 overflow-auto">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Metric Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Name</label>
                      <div className="mt-1">{widget.metricName}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Display Name</label>
                      <div className="mt-1">{metricDefinition?.displayName || widget.metricName}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Category</label>
                      <div className="mt-1">{metricDefinition?.category || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Unit</label>
                      <div className="mt-1">{metricDefinition?.unit || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Breakdown</label>
                      <div className="mt-1 capitalize">{widget.breakdown}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Visualization</label>
                      <div className="mt-1">KPI Tile</div>
                    </div>
                  </div>
                  
                  {metricDefinition?.description && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Description</label>
                      <div className="mt-1 text-sm">{metricDefinition.description}</div>
                    </div>
                  )}
                  
                  {metricDefinition?.formula && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Formula</label>
                      <div className="mt-1 font-mono text-sm bg-muted p-2 rounded">
                        {metricDefinition.formula}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {compareMode && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Compare Mode</CardTitle>
                    <CardDescription>This widget is currently in compare mode</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm">
                      Comparing {compareEntities?.length || 0} entities
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
} 