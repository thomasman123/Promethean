"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { MultiSelect } from "@/components/ui/multi-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, ClipboardList, CheckCircle2, Target, TrendingUp, Clock, DollarSign, Users, MessageSquare, Star } from "lucide-react";

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
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-green-900 mb-3">🎉 All Complete!</h1>
            <p className="text-green-700 mb-6">Amazing work! You've successfully completed all your assigned data updates.</p>
            <Button 
              size="lg" 
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              onClick={() => window.location.href = '/dashboard'}
            >
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (totalItems === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-blue-900 mb-3">All Caught Up!</h1>
            <p className="text-blue-700 mb-6">You don't have any pending appointments or discoveries to update right now.</p>
            <Button 
              size="lg" 
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              onClick={() => window.location.href = '/dashboard'}
            >
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto p-6 max-w-4xl">
        {/* Progress Header */}
        <div className="mb-8">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                      Data Updates
                    </h1>
                    <p className="text-slate-600 text-sm">Complete all assigned updates to continue</p>
                  </div>
                </div>
                <Badge variant="secondary" className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-0">
                  {completedCount} of {totalItems} completed
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2 bg-slate-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current Item - Always Open */}
        {currentItem && (
          <DataEntryCard
            item={currentItem}
            onComplete={() => handleItemComplete(currentItem.id)}
          />
        )}
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
    <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl font-semibold text-white">
              {item.leadName}
            </CardTitle>
            <CardDescription className="text-blue-100">
              Appointment • {new Date(item.scheduledAt).toLocaleString()}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-8">
        <Tabs defaultValue="outcome" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="outcome" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Outcome
            </TabsTrigger>
            <TabsTrigger value="engagement" className="flex items-center gap-2" disabled={!mustShowFollowSteps}>
              <Users className="h-4 w-4" />
              Engagement
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-2" disabled={!mustShowFollowSteps}>
              <TrendingUp className="h-4 w-4" />
              Results
            </TabsTrigger>
            <TabsTrigger value="feedback" className="flex items-center gap-2" disabled={!mustShowFollowSteps}>
              <MessageSquare className="h-4 w-4" />
              Feedback
            </TabsTrigger>
          </TabsList>

          <TabsContent value="outcome" className="space-y-6">
            <div className="space-y-3">
              <Label className="text-base font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Call Outcome
              </Label>
              <Select value={callOutcome} onValueChange={(v: CallOutcome) => setCallOutcome(v)}>
                <SelectTrigger className="h-12"><SelectValue placeholder="What happened on this call?" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="show">✅ Show</SelectItem>
                  <SelectItem value="no_show">❌ No Show</SelectItem>
                  <SelectItem value="reschedule">📅 Reschedule</SelectItem>
                  <SelectItem value="cancel">🚫 Cancel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!mustShowFollowSteps && (
              <LeadQualitySection leadQuality={leadQuality} setLeadQuality={setLeadQuality} />
            )}
          </TabsContent>

          {mustShowFollowSteps && (
            <>
              <TabsContent value="engagement" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-base font-medium flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Watched Assets?
                    </Label>
                    <Select value={watchedAssets} onValueChange={(v: "true" | "false") => setWatchedAssets(v)}>
                      <SelectTrigger className="h-12"><SelectValue placeholder="Did they watch?" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">✅ Yes</SelectItem>
                        <SelectItem value="false">❌ No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-medium flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Pitched?
                    </Label>
                    <Select value={pitched} onValueChange={(v: "true" | "false") => setPitched(v)}>
                      <SelectTrigger className="h-12"><SelectValue placeholder="Did you pitch?" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">✅ Yes</SelectItem>
                        <SelectItem value="false">❌ No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="results" className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Shown Outcome
                  </Label>
                  <Select value={shownOutcome} onValueChange={(v: ShownOutcome) => setShownOutcome(v)}>
                    <SelectTrigger className="h-12"><SelectValue placeholder="What was the result?" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="won">🎉 Won</SelectItem>
                      <SelectItem value="lost">😔 Lost</SelectItem>
                      <SelectItem value="follow_up">⏳ Follow Up</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {won && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
                    <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Sales Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-green-800">Cash Collected</Label>
                        <Input 
                          type="number" 
                          inputMode="decimal" 
                          value={cashCollected} 
                          onChange={(e) => setCashCollected(e.target.value)} 
                          placeholder="0.00"
                          className="h-12 border-green-200 focus:border-green-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-green-800">Total Sales Value</Label>
                        <Input 
                          type="number" 
                          inputMode="decimal" 
                          value={totalSalesValue} 
                          onChange={(e) => setTotalSalesValue(e.target.value)} 
                          placeholder="0.00"
                          className="h-12 border-green-200 focus:border-green-400"
                        />
                      </div>
                    </div>
                    {needsPlan && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-sm font-medium text-blue-900 flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          Payment Plan Needed
                        </div>
                        <p className="text-xs text-blue-700 mt-1">Cash collected is less than total sales value. Payment plan will be configured.</p>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="feedback" className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Objections (select all that apply)
                  </Label>
                  <MultiSelect
                    options={objectionOptions}
                    selected={objections}
                    onChange={setObjections}
                    placeholder="What objections came up?"
                    maxItems={3}
                    className="min-h-12"
                  />
                </div>

                <LeadQualitySection leadQuality={leadQuality} setLeadQuality={setLeadQuality} />
              </TabsContent>
            </>
          )}
        </Tabs>

        <Separator className="my-8" />

        <div className="flex justify-end">
          <Button 
            disabled={!canSubmit} 
            onClick={handleSubmit} 
            size="lg"
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
          >
            Complete & Continue →
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
    <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
      <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl font-semibold text-white">
              {item.leadName}
            </CardTitle>
            <CardDescription className="text-purple-100">
              Discovery • {new Date(item.scheduledAt).toLocaleString()}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-8 space-y-6">
        <div className="space-y-3">
          <Label className="text-base font-medium flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Discovery Outcome
          </Label>
          <Select value={outcome} onValueChange={setOutcome}>
            <SelectTrigger className="h-12"><SelectValue placeholder="What was the discovery result?" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="qualified">✅ Qualified</SelectItem>
              <SelectItem value="not_qualified">❌ Not Qualified</SelectItem>
              <SelectItem value="follow_up">⏳ Follow Up</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <div className="flex justify-end">
          <Button 
            disabled={!outcome} 
            onClick={handleSubmit} 
            size="lg"
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
          >
            Complete & Continue →
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LeadQualitySection({ leadQuality, setLeadQuality }: { leadQuality: string; setLeadQuality: (v: string) => void }) {
  return (
    <div className="space-y-3">
      <Label className="text-base font-medium flex items-center gap-2">
        <Star className="h-4 w-4" />
        Lead Quality
      </Label>
      <Select value={leadQuality} onValueChange={setLeadQuality}>
        <SelectTrigger className="h-12"><SelectValue placeholder="Rate this lead (1-5 stars)" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="1">⭐ 1 - Poor</SelectItem>
          <SelectItem value="2">⭐⭐ 2 - Below Average</SelectItem>
          <SelectItem value="3">⭐⭐⭐ 3 - Average</SelectItem>
          <SelectItem value="4">⭐⭐⭐⭐ 4 - Good</SelectItem>
          <SelectItem value="5">⭐⭐⭐⭐⭐ 5 - Excellent</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
} 