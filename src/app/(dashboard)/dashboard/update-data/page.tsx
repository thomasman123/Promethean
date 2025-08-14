"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { MultiSelect } from "@/components/ui/multi-select";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, ClipboardList, CheckCircle2, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface AppointmentItem {
  id: string;
  leadName: string;
  scheduledAt: string;
  type: "appointment";
}

interface DiscoveryItem {
  id: string;
  leadName: string;
  scheduledAt: string;
  type: "discovery";
}

type DataItem = AppointmentItem | DiscoveryItem;

type CallOutcome = "show" | "no_show" | "reschedule" | "cancel";
type ShownOutcome = "won" | "lost" | "follow_up";

const objectionOptions = [
  { value: "objectionless", label: "Objection-less sale" },
  { value: "hung_up", label: "Hung up before pitch" },
  { value: "logistics_money", label: "Logistical – Money" },
  { value: "partner", label: "Partner" },
  { value: "fear_money", label: "Fear – Money" },
  { value: "fear_partner", label: "Fear – Partner" },
  { value: "fear_think", label: "Fear – Think about it" },
  { value: "time", label: "Time" },
  { value: "value", label: "Value" },
  { value: "competitors", label: "Competitors" },
];

export default function UpdateDataPage() {
  const { selectedAccountId } = useAuth();
  const [allItems, setAllItems] = useState<DataItem[]>([]);
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlowComplete, setIsFlowComplete] = useState(false);

  useEffect(() => {
    // TODO: fetch assigned appointments and discoveries for current user
    const mockAppointments: AppointmentItem[] = [
      { id: "a1", leadName: "Acme Co / John", scheduledAt: new Date().toISOString(), type: "appointment" },
      { id: "a2", leadName: "Globex / Mary", scheduledAt: new Date().toISOString(), type: "appointment" },
    ];
    const mockDiscoveries: DiscoveryItem[] = [
      // No discoveries for now
    ];
    
    setAllItems([...mockAppointments, ...mockDiscoveries]);
  }, [selectedAccountId]);

  const currentItem = allItems[currentIndex];
  const totalItems = allItems.length;
  const completedCount = completedItems.size;
  const progress = totalItems > 0 ? (completedCount / totalItems) * 100 : 0;

  const handleItemComplete = (itemId: string) => {
    setCompletedItems(prev => new Set([...prev, itemId]));
    
    // Move to next item or complete flow
    if (currentIndex < allItems.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsFlowComplete(true);
    }
  };

  if (isFlowComplete) {
    return (
      <div className="p-6 space-y-6">
        <div className="rounded-lg bg-green-50 border border-green-200 p-6 text-center">
          <CheckCircle2 className="mx-auto h-16 w-16 text-green-600 mb-4" />
          <h1 className="text-2xl font-bold text-green-900">All Data Updates Complete!</h1>
          <p className="text-green-700 mt-2">You've successfully completed all assigned data updates.</p>
          <Button className="mt-4" onClick={() => window.location.href = '/dashboard'}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (totalItems === 0) {
    return (
      <div className="p-6 space-y-6">
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-6 text-center">
          <CheckCircle2 className="mx-auto h-16 w-16 text-blue-600 mb-4" />
          <h1 className="text-2xl font-bold text-blue-900">No Data Updates Needed</h1>
          <p className="text-blue-700 mt-2">You don't have any pending appointments or discoveries to update.</p>
          <Button className="mt-4" onClick={() => window.location.href = '/dashboard'}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const upcoming = allItems.slice(currentIndex + 1, currentIndex + 4);

  return (
    <div className="p-6 space-y-6">
      {/* Progress Header */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl">Update Data</CardTitle>
              <CardDescription>Complete all assigned data updates to continue</CardDescription>
            </div>
            <Badge variant="outline">
              {completedCount} of {totalItems} completed
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={progress} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          {currentItem && (
            <DataEntryCard
              item={currentItem}
              onComplete={() => handleItemComplete(currentItem.id)}
            />
          )}
        </div>
        <div className="lg:col-span-4">
          <Card className="border bg-card/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Queue</CardTitle>
              <CardDescription>Upcoming items</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[360px] pr-2">
                <div className="space-y-2">
                  {upcoming.length === 0 && (
                    <div className="text-sm text-muted-foreground">No upcoming items</div>
                  )}
                  {upcoming.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-md border p-3 bg-background pointer-events-none opacity-80">
                      <div className="rounded-md border size-8 grid place-items-center">
                        {item.type === "appointment" ? (
                          <Calendar className="h-4 w-4" />
                        ) : (
                          <ClipboardList className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{item.leadName}</div>
                        <div className="truncate text-xs text-muted-foreground">{new Date(item.scheduledAt).toLocaleString()}</div>
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        <Badge variant="secondary" className="capitalize">{item.type}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DataEntryCard({ item, onComplete }: { item: DataItem; onComplete: () => void }) {
  if (item.type === "appointment") {
    return <AppointmentEntryCard item={item} onComplete={onComplete} />;
  } else {
    return <DiscoveryEntryCard item={item} onComplete={onComplete} />;
  }
}

function AppointmentEntryCard({ 
  item, 
  onComplete 
}: { 
  item: AppointmentItem;
  onComplete: () => void;
}) {
  // Form state
  const [callOutcome, setCallOutcome] = useState<CallOutcome | "">("");
  const [watchedAssets, setWatchedAssets] = useState<"true" | "false" | "">("");
  const [pitched, setPitched] = useState<"true" | "false" | "">("");
  const [shownOutcome, setShownOutcome] = useState<ShownOutcome | "">("");
  const [cashCollected, setCashCollected] = useState<string>("");
  const [totalSalesValue, setTotalSalesValue] = useState<string>("");
  const [objections, setObjections] = useState<string[]>([]);
  const [leadQuality, setLeadQuality] = useState<string>("");

  const mustShowFollowSteps = callOutcome === "show";
  const won = shownOutcome === "won";
  const needsPlan = won && Number(cashCollected || 0) < Number(totalSalesValue || 0);

  const canSubmit = useMemo(() => {
    if (!callOutcome) return false;
    if (!mustShowFollowSteps) return !!leadQuality;

    if (!watchedAssets || !pitched || !shownOutcome) return false;
    if (won) {
      if (!cashCollected || !totalSalesValue) return false;
    }
    if (objections.length === 0 || !leadQuality) return false;
    return true;
  }, [callOutcome, mustShowFollowSteps, watchedAssets, pitched, shownOutcome, won, cashCollected, totalSalesValue, objections, leadQuality]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const payload = {
      callOutcome,
      watchedAssets: watchedAssets === 'true',
      pitched: pitched === 'true',
      shownOutcome,
      cashCollected: cashCollected ? Number(cashCollected) : undefined,
      totalSalesValue: totalSalesValue ? Number(totalSalesValue) : undefined,
      objections,
      leadQuality: Number(leadQuality),
    };
    try {
      const res = await fetch('/api/appointments/outcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId: item.id, payload })
      });
      if (!res.ok) throw new Error(await res.text());
      onComplete();
    } catch (e) {
      console.error('Failed to save outcome', e);
    }
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="rounded-md border size-9 grid place-items-center">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Appointment: {item.leadName}</CardTitle>
              <CardDescription>Scheduled: {new Date(item.scheduledAt).toLocaleString()}</CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="capitalize">appointment</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <Alert className="bg-card/60">
          <AlertTitle>Quick tip</AlertTitle>
          <AlertDescription>Complete each section in order. When you finish, click Continue to move to the next item.</AlertDescription>
        </Alert>

        {/* Step 1: Call Outcome */}
        <div className="space-y-2">
          <Label>Call Outcome</Label>
          <Select value={callOutcome} onValueChange={(v: CallOutcome) => setCallOutcome(v)}>
            <SelectTrigger><SelectValue placeholder="Select outcome" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="show">Show</SelectItem>
              <SelectItem value="no_show">No Show</SelectItem>
              <SelectItem value="reschedule">Reschedule</SelectItem>
              <SelectItem value="cancel">Cancel</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Early exit to Lead Quality if not show */}
        {(!mustShowFollowSteps) ? (
          <LeadQualitySection leadQuality={leadQuality} setLeadQuality={setLeadQuality} />
        ) : (
          <>
            {/* Step 2: Watched Assets */}
            <div className="space-y-2">
              <Label>Watched Assets?</Label>
              <Select value={watchedAssets} onValueChange={(v: "true" | "false") => setWatchedAssets(v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">True</SelectItem>
                  <SelectItem value="false">False</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Step 3: Pitched? */}
            <div className="space-y-2">
              <Label>Pitched?</Label>
              <Select value={pitched} onValueChange={(v: "true" | "false") => setPitched(v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">True</SelectItem>
                  <SelectItem value="false">False</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Step 4: Shown Outcome */}
            <div className="space-y-2">
              <Label>Shown Outcome</Label>
              <Select value={shownOutcome} onValueChange={(v: ShownOutcome) => setShownOutcome(v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="won">Won</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                  <SelectItem value="follow_up">Follow Up</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Step 5: Cash Details if Won */}
            {won && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Cash Collected</Label>
                  <Input type="number" inputMode="decimal" value={cashCollected} onChange={(e) => setCashCollected(e.target.value)} placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>Total Sales Value</Label>
                  <Input type="number" inputMode="decimal" value={totalSalesValue} onChange={(e) => setTotalSalesValue(e.target.value)} placeholder="0.00" />
                </div>
                {needsPlan && (
                  <Alert className="md:col-span-2 bg-card/60">
                    <AlertTitle>Payment Plan Recommended</AlertTitle>
                    <AlertDescription>Cash collected is less than total sales value. Configure a payment plan once saved.</AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Step 6: Objections - Multi Select */}
            <div className="space-y-2">
              <Label>Objections (select all that apply)</Label>
              <MultiSelect
                options={objectionOptions}
                selected={objections}
                onChange={setObjections}
                placeholder="Select objections"
                maxItems={3}
              />
            </div>

            {/* Step 7: Lead Quality */}
            <LeadQualitySection leadQuality={leadQuality} setLeadQuality={setLeadQuality} />
          </>
        )}

        <Separator />

        <div className="flex items-center justify-end gap-3">
          <Button variant="outline">Save draft</Button>
          <Button disabled={!canSubmit} onClick={handleSubmit} size="lg" className="gap-2">
            Complete & Continue <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DiscoveryEntryCard({ 
  item, 
  onComplete 
}: { 
  item: DiscoveryItem;
  onComplete: () => void;
}) {
  const [outcome, setOutcome] = useState<string>("");

  const handleSubmit = async () => {
    if (!outcome) return;
    try {
      // TODO: API call for discovery outcome
      console.log('Discovery outcome:', { discoveryId: item.id, outcome });
      onComplete();
    } catch (e) {
      console.error('Failed to save discovery outcome', e);
    }
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="rounded-md border size-9 grid place-items-center">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Discovery: {item.leadName}</CardTitle>
              <CardDescription>Scheduled: {new Date(item.scheduledAt).toLocaleString()}</CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="capitalize">discovery</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <Alert className="bg-card/60">
          <AlertTitle>Quick tip</AlertTitle>
          <AlertDescription>Record the discovery outcome accurately to help your team qualify leads.</AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label>Discovery Outcome</Label>
          <Select value={outcome} onValueChange={setOutcome}>
            <SelectTrigger><SelectValue placeholder="Select outcome" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="not_qualified">Not Qualified</SelectItem>
              <SelectItem value="follow_up">Follow Up</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <div className="flex items-center justify-end gap-3">
          <Button variant="outline">Save draft</Button>
          <Button disabled={!outcome} onClick={handleSubmit} size="lg" className="gap-2">
            Complete & Continue <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LeadQualitySection({ leadQuality, setLeadQuality }: { leadQuality: string; setLeadQuality: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>Lead Quality</Label>
      <Select value={leadQuality} onValueChange={setLeadQuality}>
        <SelectTrigger><SelectValue placeholder="Select quality (1–5)" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="1">1</SelectItem>
          <SelectItem value="2">2</SelectItem>
          <SelectItem value="3">3</SelectItem>
          <SelectItem value="4">4</SelectItem>
          <SelectItem value="5">5</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
} 