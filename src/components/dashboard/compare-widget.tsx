"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PairMatrix } from "./views/pair-matrix";
import { PairTable } from "./views/pair-table";
import { ChartWrapper } from "./charts/chart-wrapper";
import { useDashboardStore } from "@/lib/dashboard/store";
import { SetterRepPair } from "@/lib/dashboard/types";
import { Skeleton } from "@/components/ui/skeleton";

interface CompareWidgetProps {
  widgetId: string;
  className?: string;
}

type CompareView = 'matrix' | 'table';
type CompareMetric = 'appointments' | 'revenue' | 'winRate' | 'showRate';

// Mock data generator
const generateMockPairs = (
  setterIds: string[], 
  repIds: string[],
  filters: any,
  settings: any
): SetterRepPair[] => {
  const pairs: SetterRepPair[] = [];
  
  // Include INBOUND if no setters selected
  const effectiveSetterIds = setterIds.length > 0 ? setterIds : ['INBOUND'];
  const setterNames = effectiveSetterIds.map(id => 
    id === 'INBOUND' ? 'INBOUND' : `Setter ${id.slice(-1)}`
  );
  
  effectiveSetterIds.forEach((setterId, setterIndex) => {
    repIds.forEach((repId, repIndex) => {
      // Generate realistic mock data
      const baseAppointments = Math.floor(Math.random() * 30) + 10;
      const showRate = 0.7 + Math.random() * 0.25;
      const winRate = 0.15 + Math.random() * 0.25;
      const avgDealSize = 5000 + Math.random() * 10000;
      
      // Apply some patterns to make it interesting
      const setterSkill = setterId === 'INBOUND' ? 1.2 : 1 + (setterIndex * 0.1);
      const repSkill = 1 + (repIndex * 0.15);
      
      pairs.push({
        setterId,
        setterName: setterNames[setterIndex],
        repId,
        repName: `Rep ${repId.slice(-1)}`,
        metrics: {
          appointments: Math.floor(baseAppointments * setterSkill),
          showRate: Math.min(0.95, showRate * setterSkill),
          winRate: Math.min(0.40, winRate * repSkill),
          revenue: Math.floor(baseAppointments * showRate * winRate * avgDealSize * setterSkill * repSkill)
        }
      });
    });
  });
  
  return pairs;
};

export function CompareWidget({ widgetId, className }: CompareWidgetProps) {
  const [view, setView] = useState<CompareView>('matrix');
  const [metric, setMetric] = useState<CompareMetric>('revenue');
  const [loading, setLoading] = useState(true);
  const [pairs, setPairs] = useState<SetterRepPair[]>([]);
  
  const { 
    compareEntities, 
    compareModeSettings,
    filters,
    updateWidget 
  } = useDashboardStore();
  
  const selectedSetters = compareEntities.filter(e => e.type === 'setter');
  const selectedReps = compareEntities.filter(e => e.type === 'rep');

  // Load data when entities or filters change
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const mockPairs = generateMockPairs(
        selectedSetters.map(s => s.id),
        selectedReps.map(r => r.id),
        filters,
        compareModeSettings
      );
      
      setPairs(mockPairs);
      setLoading(false);
    };
    
    loadData();
  }, [selectedSetters, selectedReps, filters, compareModeSettings]);

  const handleCellClick = (setterId: string, repId: string) => {
    console.log('Drill down into appointments for:', { setterId, repId });
    // TODO: Open appointment details modal
  };

  if (compareModeSettings.scope !== 'pair') {
    return (
      <ChartWrapper
        title="Compare Mode Widget"
        description="This widget requires Setter × Rep compare mode"
        onEdit={() => updateWidget(widgetId, {})}
      >
        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
          <p>Switch to "Setter × Rep" mode to see pair comparisons</p>
        </div>
      </ChartWrapper>
    );
  }

  return (
    <ChartWrapper
      title="Setter × Rep Performance"
      description={`Analyzing ${pairs.length} setter-rep combinations`}
      onEdit={() => updateWidget(widgetId, {})}
      className={className}
    >
      <div className="space-y-4">
        {/* Controls */}
        <div className="flex items-center justify-between px-6 pt-2">
          <Tabs value={view} onValueChange={(v) => setView(v as CompareView)}>
            <TabsList>
              <TabsTrigger value="matrix">Matrix View</TabsTrigger>
              <TabsTrigger value="table">Table View</TabsTrigger>
            </TabsList>
          </Tabs>
          
          {view === 'matrix' && (
            <Select value={metric} onValueChange={(v) => setMetric(v as CompareMetric)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="appointments">Sales Calls</SelectItem>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="winRate">Win Rate</SelectItem>
                <SelectItem value="showRate">Show Rate</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-6">
            <Skeleton className="h-[400px] w-full" />
          </div>
        ) : (
          <>
            {view === 'matrix' ? (
              <PairMatrix
                setters={selectedSetters.map(s => ({ id: s.id, name: s.name }))}
                reps={selectedReps.map(r => ({ id: r.id, name: r.name }))}
                pairs={pairs}
                metric={metric}
                onCellClick={handleCellClick}
              />
            ) : (
              <PairTable
                pairs={pairs}
                onPairClick={handleCellClick}
              />
            )}
          </>
        )}
      </div>
    </ChartWrapper>
  );
} 