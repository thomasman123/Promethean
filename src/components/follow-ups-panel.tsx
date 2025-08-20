"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar as CalendarIcon, CalendarDays } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { MultiSelect } from "@/components/ui/multi-select";
import { Calendar } from "@/components/ui/calendar";

interface FollowUpItem {
	id: string;
	leadName: string;
	followUpAt: string;
}

type ViewMode = "list" | "calendar";

type FUResult = "won" | "lost" | "";

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

export function FollowUpsPanel() {
	const { selectedAccountId, effectiveUserId } = useAuth();
	const [items, setItems] = useState<FollowUpItem[]>([]);
	const [view, setView] = useState<ViewMode>("list");
	const [openId, setOpenId] = useState<string | null>(null);
	const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

	useEffect(() => {
		const fetchItems = async () => {
			if (!selectedAccountId || !effectiveUserId) return;
			const { data, error } = await supabase
				.from('appointments')
				.select('id, contact_id, follow_up_at')
				.eq('account_id', selectedAccountId)
				.eq('sales_rep_user_id', effectiveUserId)
				.eq('show_outcome', 'follow up')
				.is('follow_up_show_outcome', null)
				.not('follow_up_at', 'is', null)
				.order('follow_up_at', { ascending: true });
			if (error) {
				setItems([]);
				return;
			}
			const mapped: FollowUpItem[] = (data || []).map((a) => ({
				id: a.id as string,
				leadName: (a as any).contact_id as string,
				followUpAt: (a as any).follow_up_at as string,
			}));
			setItems(mapped);
		};
		fetchItems();
	}, [selectedAccountId, effectiveUserId]);

	const itemsForSelectedDate = useMemo(() => {
		if (!selectedDate) return items;
		const y = selectedDate.getFullYear();
		const m = selectedDate.getMonth();
		const d = selectedDate.getDate();
		return items.filter((it) => {
			const dt = new Date(it.followUpAt);
			return dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d;
		});
	}, [items, selectedDate]);

	return (
		<Card className="border shadow-sm">
			<CardHeader className="flex flex-row items-center justify-between">
				<div>
					<CardTitle className="text-2xl">Follow Ups</CardTitle>
					<CardDescription>View and complete your scheduled follow ups</CardDescription>
				</div>
				<div className="w-[200px]">
					<Select value={view} onValueChange={(v: ViewMode) => setView(v)}>
						<SelectTrigger>
							<SelectValue placeholder="View" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="list">List</SelectItem>
							<SelectItem value="calendar">Calendar</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</CardHeader>
			<CardContent>
				{view === "list" ? (
					<div className="space-y-2">
						{items.length === 0 && (
							<div className="text-sm text-muted-foreground">No follow ups scheduled</div>
						)}
						{items.map((it) => (
							<div key={it.id} className="flex items-center justify-between rounded-md border p-3">
								<div className="flex items-center gap-3">
									<div className="rounded-md border size-9 grid place-items-center">
										<CalendarIcon className="h-5 w-5" />
									</div>
									<div>
										<div className="text-sm font-medium">{it.leadName}</div>
										<div className="text-xs text-muted-foreground">{new Date(it.followUpAt).toLocaleString()}</div>
									</div>
								</div>
								<div className="flex items-center gap-2">
									<Badge variant="secondary">Follow Up</Badge>
									<Button onClick={() => setOpenId(it.id)} size="sm">Complete</Button>
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="md:col-span-1">
							<Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} />
						</div>
						<div className="md:col-span-2 space-y-2">
							{itemsForSelectedDate.length === 0 && (
								<div className="text-sm text-muted-foreground">No follow ups for this date</div>
							)}
							{itemsForSelectedDate.map((it) => (
								<div key={it.id} className="flex items-center justify-between rounded-md border p-3">
									<div className="flex items-center gap-3">
										<div className="rounded-md border size-9 grid place-items-center">
											<CalendarDays className="h-5 w-5" />
										</div>
										<div>
											<div className="text-sm font-medium">{it.leadName}</div>
											<div className="text-xs text-muted-foreground">{new Date(it.followUpAt).toLocaleString()}</div>
										</div>
									</div>
									<Button onClick={() => setOpenId(it.id)} size="sm">Complete</Button>
								</div>
							))}
						</div>
					</div>
				)}
			</CardContent>
			{openId && (
				<CompleteFollowUpSheet id={openId} onOpenChange={(v) => !v && setOpenId(null)} onCompleted={() => setOpenId(null)} />
			)}
		</Card>
	);
}

function CompleteFollowUpSheet({ id, onOpenChange, onCompleted }: { id: string; onOpenChange: (v: boolean) => void; onCompleted: () => void }) {
	const [open, setOpen] = useState(true);
	const [result, setResult] = useState<FUResult>("");
	const [cashCollected, setCashCollected] = useState("");
	const [totalSalesValue, setTotalSalesValue] = useState("");
	const [objections, setObjections] = useState<string[]>([]);
	const [leadQuality, setLeadQuality] = useState("");
	const [watched, setWatched] = useState<"true" | "false" | "">("");
	const [pitched, setPitched] = useState<"true" | "false" | "">("");

	const won = result === "won";
	const canSubmit = useMemo(() => {
		if (!result) return false;
		if (won) {
			if (!cashCollected || !totalSalesValue) return false;
		}
		return true;
	}, [result, won, cashCollected, totalSalesValue]);

	const handleSubmit = async () => {
		if (!canSubmit) return;
		const payload = {
			showOutcome: result as 'won' | 'lost',
			cashCollected: cashCollected ? Number(cashCollected) : undefined,
			totalSalesValue: totalSalesValue ? Number(totalSalesValue) : undefined,
			objections,
			leadQuality: leadQuality ? Number(leadQuality) : undefined,
			watchedAssets: watched ? watched === 'true' : undefined,
			pitched: pitched ? pitched === 'true' : undefined,
		};
		const res = await fetch('/api/appointments/follow-up', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ appointmentId: id, payload })
		});
		if (!res.ok) {
			console.error(await res.text());
			return;
		}
		onCompleted();
	};

	return (
		<Sheet open={open} onOpenChange={(v) => { setOpen(v); onOpenChange(v); }}>
			<SheetContent className="max-h-[92vh] overflow-auto w-full sm:max-w-2xl" side="right">
				<SheetHeader>
					<SheetTitle>Complete Follow Up</SheetTitle>
					<SheetDescription>Record the result of your follow up</SheetDescription>
				</SheetHeader>
				<div className="p-4 space-y-4">
					<div className="space-y-2">
						<Label>Result</Label>
						<Select value={result} onValueChange={(v: FUResult) => setResult(v)}>
							<SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
							<SelectContent>
								<SelectItem value="won">Won</SelectItem>
								<SelectItem value="lost">Lost</SelectItem>
							</SelectContent>
						</Select>
					</div>

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
						</div>
					)}

					<div className="space-y-2">
						<Label>Objections (optional)</Label>
						<MultiSelect options={objectionOptions} selected={objections} onChange={setObjections} placeholder="Select objections" maxItems={3} />
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
						<div className="space-y-2">
							<Label>Lead Quality (optional)</Label>
							<Select value={leadQuality} onValueChange={setLeadQuality}>
								<SelectTrigger><SelectValue placeholder="1–5" /></SelectTrigger>
								<SelectContent>
									<SelectItem value="1">1</SelectItem>
									<SelectItem value="2">2</SelectItem>
									<SelectItem value="3">3</SelectItem>
									<SelectItem value="4">4</SelectItem>
									<SelectItem value="5">5</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>Watched Assets?</Label>
							<Select value={watched} onValueChange={(v: "true" | "false") => setWatched(v)}>
								<SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
								<SelectContent>
									<SelectItem value="true">True</SelectItem>
									<SelectItem value="false">False</SelectItem>
								</SelectContent>
							</Select>
						</div>
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
					</div>

					<Separator />

					<div className="flex justify-end gap-2">
						<Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
						<Button disabled={!canSubmit} onClick={handleSubmit}>Save</Button>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
} 