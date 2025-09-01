"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Info,
  Calculator,
  TrendingUp,
  AlertTriangle,
  Database,
  ExternalLink,
  Copy,
} from "lucide-react";
import { useDetailedDataStore } from "@/lib/dashboard/detailed-data-store";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DrilldownData {
  metric: string;
  value: number | string;
  formula: string;
  contributors: any[];
  calculationTrace: {
    step: string;
    description: string;
    result: number | string;
  }[];
  anomalies?: {
    type: string;
    description: string;
    severity: "high" | "medium" | "low";
  }[];
  dataLineage: {
    sourceTable: string;
    lastSync: Date;
    rowCount: number;
    filters: string[];
  };
}

export function DrilldownModal() {
  const { selectedAccountId } = useAuth();
  const { isDrilldownOpen, closeDrilldown, drilldownData } = useDetailedDataStore();
  const [activeTab, setActiveTab] = useState("contributors");
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<DrilldownData | null>(null);

  useEffect(() => {
    if (isDrilldownOpen && drilldownData) {
      loadDrilldownData();
    }
  }, [isDrilldownOpen, drilldownData]);

  const loadDrilldownData = async () => {
    setIsLoading(true);
    try {
      // TODO: Fetch actual drill-down data from API
      // For now, use mock data
      const mockData: DrilldownData = {
        metric: drilldownData.metric || "Total Appointments",
        value: drilldownData.value || 342,
        formula: "COUNT(appointments WHERE status IN ['booked', 'rescheduled'] AND booked_at BETWEEN date_range)",
        contributors: [
          { id: "apt-1", contact: "John Doe", setter: "Alice Smith", booked_at: new Date(), status: "booked" },
          { id: "apt-2", contact: "Jane Smith", setter: "Bob Johnson", booked_at: new Date(), status: "rescheduled" },
          // Add more mock contributors
        ],
        calculationTrace: [
          { step: "1", description: "Fetch all appointments in date range", result: 400 },
          { step: "2", description: "Filter by status (booked, rescheduled)", result: 350 },
          { step: "3", description: "Apply setter filter", result: 342 },
        ],
        anomalies: [
          { type: "spike", description: "50% increase compared to last week", severity: "medium" },
        ],
        dataLineage: {
          sourceTable: "appointments",
          lastSync: new Date(),
          rowCount: 342,
          filters: ["date_range: 2024-01-01 to 2024-01-31", "setter_id: alice-123"],
        },
      };
      setData(mockData);
    } catch (error) {
      console.error("Failed to load drill-down data:", error);
      toast.error("Failed to load details");
    } finally {
      setIsLoading(false);
    }
  };

  const copyFormula = () => {
    if (data?.formula) {
      navigator.clipboard.writeText(data.formula);
      toast.success("Formula copied to clipboard");
    }
  };

  const openSourceRecord = (recordId: string) => {
    // TODO: Implement deep linking to source record
    console.log("Opening record:", recordId);
  };

  if (!isDrilldownOpen) return null;

  return (
    <Dialog open={isDrilldownOpen} onOpenChange={closeDrilldown}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              {data?.metric || "Metric Details"}
            </span>
            <Badge variant="secondary" className="text-lg">
              {data?.value || "-"}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Understand how this number was calculated
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="contributors">Contributors</TabsTrigger>
            <TabsTrigger value="formula">Formula</TabsTrigger>
            <TabsTrigger value="trace">Calculation Trace</TabsTrigger>
            <TabsTrigger value="lineage">Data Lineage</TabsTrigger>
          </TabsList>

          <div className="overflow-y-auto flex-1 mt-4">
            <TabsContent value="contributors" className="space-y-4">
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="text-sm text-muted-foreground">
                    Showing {data?.contributors.length || 0} records that contribute to this metric
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Setter</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.contributors.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-mono text-xs">{row.id}</TableCell>
                          <TableCell>{row.contact}</TableCell>
                          <TableCell>{row.setter}</TableCell>
                          <TableCell>{format(row.booked_at, "MMM d, yyyy")}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{row.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openSourceRecord(row.id)}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </TabsContent>

            <TabsContent value="formula" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>SQL Formula</span>
                    <Button variant="outline" size="sm" onClick={copyFormula}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted p-4 rounded-md overflow-x-auto">
                    <code className="text-sm">{data?.formula}</code>
                  </pre>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Plain English Explanation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    This metric counts all appointments where the status is either "booked" or
                    "rescheduled" and the booking date falls within the selected date range. Any
                    applied filters (setter, source, etc.) further restrict the results.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trace" className="space-y-4">
              <div className="space-y-2">
                {data?.calculationTrace.map((step, index) => (
                  <Card key={step.step}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Badge variant="outline" className="w-8 h-8 rounded-full p-0 flex items-center justify-center">
                            {step.step}
                          </Badge>
                          <div>
                            <p className="font-medium">{step.description}</p>
                            <p className="text-sm text-muted-foreground">
                              Result: {step.result}
                            </p>
                          </div>
                        </div>
                        {index < (data?.calculationTrace.length || 0) - 1 && (
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {data?.anomalies && data.anomalies.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Anomalies Detected
                    </h4>
                    <div className="space-y-2">
                      {data.anomalies.map((anomaly, i) => (
                        <Alert key={i} className={cn(
                          anomaly.severity === "high" && "border-red-500",
                          anomaly.severity === "medium" && "border-yellow-500",
                          anomaly.severity === "low" && "border-blue-500"
                        )}>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>{anomaly.description}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="lineage" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Data Source
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Source Table</p>
                      <p className="font-mono">{data?.dataLineage.sourceTable}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last Sync</p>
                      <p>{data?.dataLineage.lastSync && format(data.dataLineage.lastSync, "MMM d, yyyy h:mm a")}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Row Count in Scope</p>
                      <p>{data?.dataLineage.rowCount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Applied Filters</p>
                      <p>{data?.dataLineage.filters.length || 0} filters</p>
                    </div>
                  </div>

                  {data?.dataLineage.filters && data.dataLineage.filters.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm font-medium mb-2">Active Filters</p>
                        <div className="space-y-1">
                          {data.dataLineage.filters.map((filter, i) => (
                            <Badge key={i} variant="secondary" className="mr-2">
                              {filter}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
} 