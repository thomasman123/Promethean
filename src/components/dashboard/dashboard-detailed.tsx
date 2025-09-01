"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Download,
  Settings,
  Search,
  Filter,
  Database
} from "lucide-react";
import { RepPerformanceCards } from "./rep-performance-cards";
import { DetailedDataTable } from "./detailed-data/detailed-data-table";
import { EnhancedDataTable } from "./enhanced-data-table";
import { ColumnManager } from "./detailed-data/column-manager";
import { FilterDrawer } from "./detailed-data/filter-drawer";
import { ViewsManager } from "./detailed-data/views-manager";
import { useDetailedDataStore } from "@/lib/dashboard/detailed-data-store";
import { cn } from "@/lib/utils";

interface DashboardDetailedProps {
  className?: string;
}

export function DashboardDetailed({ className }: DashboardDetailedProps) {
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const { recordType, viewMode, groupBy, isFilterDrawerOpen, toggleFilterDrawer } = useDetailedDataStore();

  const recordTypeLabels = {
    appointments: "Appointments",
    dials: "Dials/Calls", 
    deals: "Deals/Opportunities",
    payments: "Payments/Cash",
    leads: "Leads/Contacts"
  };

  return (
    <div className={cn("flex-1 space-y-6 lg:space-y-8", className)}>
      {/* Rep Performance Cards */}
      <div className="px-4 lg:px-6 py-4">
        <RepPerformanceCards />
      </div>

      {/* Enhanced Data Table Section */}
      <div className="px-4 lg:px-6">
        <Card className="dashboard-card">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold">
                  {viewMode === 'aggregated' 
                    ? `${recordTypeLabels[recordType]} by ${groupBy}`
                    : `${recordTypeLabels[recordType]} - Individual Records`
                  }
                </CardTitle>
                <CardDescription className="text-base mt-1">
                  {viewMode === 'aggregated'
                    ? "Summarized performance metrics grouped by your selected dimension"
                    : "Detailed record-level data with full context and individual performance metrics"
                  }
                </CardDescription>
              </div>
              
              
            </div>

            {/* Table Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-4 border-t">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleFilterDrawer}
                  className="gap-2 hover:bg-accent"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                </Button>
                
                <ViewsManager />
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsColumnManagerOpen(true)}
                  className="gap-2 hover:bg-accent"
                >
                  <Settings className="h-4 w-4" />
                  Columns
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 hover:bg-accent"
                >
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </div>

              <div className="w-full sm:w-auto sm:ml-auto flex items-center gap-2">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search records..."
                    className="w-full sm:w-64 pl-9 pr-4 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="p-4">
              <DetailedDataTable />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modals and Drawers */}
      <FilterDrawer />
      <ColumnManager 
        open={isColumnManagerOpen} 
        onOpenChange={setIsColumnManagerOpen} 
      />
    </div>
  );
} 