"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";

interface AppointmentItem {
  id: string;
  leadName: string;
  scheduledAt: string;
}

type CallOutcome = "show" | "no_show" | "reschedule" | "cancel";

type ShownOutcome = "won" | "lost" | "follow_up";

export default function AppointmentsUpdatesPage() {
  const { selectedAccountId } = useAuth();
  const [items, setItems] = useState<AppointmentItem[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    // TODO: fetch assigned appointments for current user; placeholder data
    setItems([
      { id: "a1", leadName: "Acme Co / John", scheduledAt: new Date().toISOString() },
      { id: "a2", leadName: "Globex / Mary", scheduledAt: new Date().toISOString() },
    ]);
  }, [selectedAccountId]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">My Appointment Updates</h1>
        <p className="text-muted-foreground">Fill outcomes fast with a clean guided flow</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <CardTitle className="text-base">{item.leadName}</CardTitle>
              <CardDescription>
                Scheduled: {new Date(item.scheduledAt).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="sm" onClick={() => setOpenId(item.id)}>Update</Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {items.map((item) => (
        <AppointmentSheet key={`drawer-${item.id}`} open={openId === item.id} onOpenChange={(v) => !v && setOpenId(null)} item={item} />
      ))}
    </div>
  );
}

function AppointmentSheet({ open, onOpenChange, item }: { open: boolean; onOpenChange: (v: boolean) => void; item: AppointmentItem }) {
  // Form state
  const [callOutcome, setCallOutcome] = useState<CallOutcome | "">("");
  const [watchedAssets, setWatchedAssets] = useState<"true" | "false" | "">("");
  const [pitched, setPitched] = useState<"true" | "false" | "">("");
  const [shownOutcome, setShownOutcome] = useState<ShownOutcome | "">("");
  const [cashCollected, setCashCollected] = useState<string>("");
  const [totalSalesValue, setTotalSalesValue] = useState<string>("");
  const [objection, setObjection] = useState<string>("");
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
    if (!objection || !leadQuality) return false;
    return true;
  }, [callOutcome, mustShowFollowSteps, watchedAssets, pitched, shownOutcome, won, cashCollected, totalSalesValue, objection, leadQuality]);

  const reset = () => {
    setCallOutcome("");
    setWatchedAssets("");
    setPitched("");
    setShownOutcome("");
    setCashCollected("");
    setTotalSalesValue("");
    setObjection("");
    setLeadQuality("");
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const payload = {
      callOutcome,
      watchedAssets: watchedAssets === 'true',
      pitched: pitched === 'true',
      shownOutcome,
      cashCollected: cashCollected ? Number(cashCollected) : undefined,
      totalSalesValue: totalSalesValue ? Number(totalSalesValue) : undefined,
      objection: objection || undefined,
      leadQuality: Number(leadQuality),
    };
    try {
      const res = await fetch('/api/appointments/outcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId: item.id, payload })
      });
      if (!res.ok) throw new Error(await res.text());
      onOpenChange(false);
      reset();
    } catch (e) {
      console.error('Failed to save outcome', e);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-h-[92vh] overflow-auto w-full sm:max-w-2xl" side="right">
        <SheetHeader>
          <SheetTitle>Update Appointment</SheetTitle>
          <SheetDescription>{item.leadName}</SheetDescription>
        </SheetHeader>
        <div className="p-4 space-y-4">
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
                    <div className="md:col-span-2 p-3 rounded-md border">
                      <div className="text-sm font-medium">Payment Plan Builder</div>
                      <p className="text-xs text-muted-foreground">Cash collected is less than total sales value. Configure a payment plan (placeholder).</p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 6: Objections */}
              <div className="space-y-2">
                <Label>Objections</Label>
                <Select value={objection} onValueChange={setObjection}>
                  <SelectTrigger><SelectValue placeholder="Select objection" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="objectionless">Objection-less sale</SelectItem>
                    <SelectItem value="hung_up">Hung up before pitch</SelectItem>
                    <SelectItem value="logistics_money">Logistical – Money</SelectItem>
                    <SelectItem value="partner">Partner</SelectItem>
                    <SelectItem value="fear_money">Fear – Money</SelectItem>
                    <SelectItem value="fear_partner">Fear – Partner</SelectItem>
                    <SelectItem value="fear_think">Fear – Think about it</SelectItem>
                    <SelectItem value="time">Time</SelectItem>
                    <SelectItem value="value">Value</SelectItem>
                    <SelectItem value="competitors">Competitors</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Step 7: Lead Quality */}
              <LeadQualitySection leadQuality={leadQuality} setLeadQuality={setLeadQuality} />
            </>
          )}

          <Separator />

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { onOpenChange(false); reset(); }}>Cancel</Button>
            <Button disabled={!canSubmit} onClick={handleSubmit}>Submit</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
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