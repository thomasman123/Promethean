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
import { Calendar, ClipboardList, CheckCircle2, ChevronRight, Inbox, Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase";
import { DateTimePicker } from "@/components/ui/date-time-picker";

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

interface FollowUpItem {
	id: string;
	leadName: string;
	followUpAt: string;
	type: "follow_up";
}

type DataItem = AppointmentItem | DiscoveryItem | FollowUpItem;

type CallOutcome = "show" | "no_show" | "reschedule" | "cancel";

type ShownOutcome = "won" | "lost" | "follow_up";

type Mode = "all" | "followups";

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
	const { selectedAccountId, user, effectiveUserId } = useAuth();
	const [mode, setMode] = useState<Mode>("all");
	const [allItems, setAllItems] = useState<DataItem[]>([]);
	const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
	const [currentIndex, setCurrentIndex] = useState(0);
	const [isFlowComplete, setIsFlowComplete] = useState(false);

	useEffect(() => {
		const fetchItems = async () => {
			if (!selectedAccountId || !effectiveUserId) return;

			if (mode === 'followups') {
				const { data, error } = await supabase
					.from('appointments')
					.select('id, contact_name, follow_up_at')
					.eq('account_id', selectedAccountId)
					.eq('sales_rep_user_id', effectiveUserId)
					.eq('show_outcome', 'follow up')
					.is('follow_up_show_outcome', null)
					.not('follow_up_at', 'is', null)
					.order('follow_up_at', { ascending: true });
				if (error) {
					setAllItems([]);
					return;
				}
				const items: FollowUpItem[] = (data || []).map((a) => ({
					id: a.id,
					leadName: (a as any).contact_name,
					followUpAt: (a as any).follow_up_at,
					type: 'follow_up',
				}));
				setAllItems(items);
				setCurrentIndex(0);
				setCompletedItems(new Set());
				setIsFlowComplete(false);
				return;
			}

			const { data: appts, error } = await supabase
				.from('appointments')
				.select('id, contact_name, date_booked_for, sales_rep_user_id')
				.eq('account_id', selectedAccountId)
				.eq('sales_rep_user_id', effectiveUserId)
				.is('lead_quality', null)
				.order('date_booked_for', { ascending: true });

			if (error) {
				console.warn('Failed to fetch appointments:', error.message);
				setAllItems([]);
				return;
			}

			const appointments: AppointmentItem[] = (appts || []).map((a) => ({
				id: a.id,
				leadName: a.contact_name,
				scheduledAt: a.date_booked_for,
				type: 'appointment',
			}));

			const { data: discos, error: discosError } = await supabase
				.from('discoveries')
				.select('id, contact_name, date_booked_for, setter_user_id')
				.eq('account_id', selectedAccountId)
				.eq('setter_user_id', effectiveUserId)
				.is('call_outcome', null)
				.order('date_booked_for', { ascending: true });

			if (discosError) {
				console.warn('Failed to fetch discoveries:', discosError.message);
			}

			const discoveries: DiscoveryItem[] = (discos || []).map((d) => ({
				id: d.id,
				leadName: d.contact_name,
				scheduledAt: d.date_booked_for,
				type: 'discovery',
			}));

			setAllItems([...appointments, ...discoveries]);
			setCurrentIndex(0);
			setCompletedItems(new Set());
			setIsFlowComplete(false);
		};
		fetchItems();
	}, [selectedAccountId, effectiveUserId, mode]);

	const currentItem = allItems[currentIndex];
	const totalItems = allItems.length;
	const completedCount = completedItems.size;
	const progress = totalItems > 0 ? (completedCount / totalItems) * 100 : 0;

	const handleItemComplete = (itemId: string) => {
		setCompletedItems(prev => new Set([...prev, itemId]));
		if (currentIndex < allItems.length - 1) {
			setCurrentIndex(prev => prev + 1);
		} else {
			setIsFlowComplete(true);
		}
	};

	if (isFlowComplete) {
		return (
			<div className="p-6 space-y-6">
				<Card className="relative overflow-hidden border bg-card">
					<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,theme(colors.green/10),transparent_60%)]" />
					<CardHeader className="text-center space-y-2">
						<div className="mx-auto size-12 rounded-full border bg-background shadow-sm grid place-items-center">
							<Sparkles className="h-5 w-5 text-green-600" />
						</div>
						<CardTitle className="text-2xl">All data updates complete</CardTitle>
						<CardDescription>You’ve successfully completed all assigned data updates.</CardDescription>
					</CardHeader>
					<CardContent className="flex items-center justify-center gap-3 pb-6">
						<Button variant="secondary" onClick={() => window.location.reload()}>Refresh</Button>
						<Button onClick={() => (window.location.href = '/dashboard')}>View Dashboard</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	const upcoming = allItems.slice(currentIndex + 1, currentIndex + 4);

	return (
		<div className="p-6 space-y-6">
			<Card className="border shadow-sm">
				<CardHeader className="pb-3">
					<div className="flex items-center justify-between">
						<div className="space-y-1">
							<CardTitle className="text-2xl">Update Data</CardTitle>
							<CardDescription>Complete all assigned data updates to continue</CardDescription>
						</div>
						<div className="w-[180px]">
							<Select value={mode} onValueChange={(v: Mode) => setMode(v)}>
								<SelectTrigger><SelectValue placeholder="Mode" /></SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All updates</SelectItem>
									<SelectItem value="followups">Follow ups</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<Progress value={progress} />
				</CardContent>
			</Card>

			{totalItems === 0 ? (
				<Card className="relative overflow-hidden border bg-card">
					<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,theme(colors.primary/10),transparent_60%)]" />
					<CardHeader className="text-center space-y-2">
						<div className="mx-auto size-12 rounded-full border bg-background shadow-sm grid place-items-center">
							<Inbox className="h-5 w-5 text-primary" />
						</div>
						<CardTitle className="text-2xl">No Data Updates Needed</CardTitle>
						<CardDescription>You don’t have any pending items to update.</CardDescription>
					</CardHeader>
					<CardContent className="flex items-center justify-center gap-3 pb-6">
						<Button variant="secondary" onClick={() => window.location.reload()}>Refresh</Button>
						<Button onClick={() => (window.location.href = '/dashboard')}>Return to Dashboard</Button>
					</CardContent>
				</Card>
			) : (
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
					<div className="lg:col-span-8">
						{currentItem && (
							<DataEntryCard
								mode={mode}
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
													<div className="truncate text-xs text-muted-foreground">{('scheduledAt' in item ? new Date((item as any).scheduledAt).toLocaleString() : new Date((item as any).followUpAt).toLocaleString())}</div>
												</div>
												<div className="ml-auto flex items-center gap-2">
													<Badge variant="secondary" className="capitalize">{item.type === 'follow_up' ? 'follow up' : item.type}</Badge>
												</div>
											</div>
										))}
									</div>
								</ScrollArea>
							</CardContent>
						</Card>
					</div>
				</div>
			)}

			{/* Follow Ups panel embedded below the update section */}
			{/* Removed embedded FollowUpsPanel to keep follow-ups as a separate page */}
		</div>
	);
}

function DataEntryCard({ mode, item, onComplete }: { mode: Mode; item: DataItem; onComplete: () => void }) {
	if (mode === 'followups') {
		return <FollowUpEntryCard item={item as FollowUpItem} onComplete={onComplete} />;
	}
	if (item.type === "appointment") {
		return <AppointmentEntryCard item={item as AppointmentItem} onComplete={onComplete} />;
	} else {
		return <DiscoveryEntryCard item={item as DiscoveryItem} onComplete={onComplete} />;
	}
}

function AppointmentEntryCard({ 
	item, 
	onComplete 
}: { 
	item: AppointmentItem;
	onComplete: () => void;
}) {
	const [callOutcome, setCallOutcome] = useState<CallOutcome | "">("");
	const [watchedAssets, setWatchedAssets] = useState<"true" | "false" | "">("");
	const [pitched, setPitched] = useState<"true" | "false" | "">("");
	const [shownOutcome, setShownOutcome] = useState<ShownOutcome | "">("");
	const [cashCollected, setCashCollected] = useState<string>("");
	const [totalSalesValue, setTotalSalesValue] = useState<string>("");
	const [objections, setObjections] = useState<string[]>([]);
	const [leadQuality, setLeadQuality] = useState<string>("");
	const [followUpAt, setFollowUpAt] = useState<string>("");

	const mustShowFollowSteps = callOutcome === "show";
	const won = shownOutcome === "won";
	const isFollowUp = shownOutcome === "follow_up";
	const needsPlan = won && Number(cashCollected || 0) < Number(totalSalesValue || 0);

	const canSubmit = useMemo(() => {
		if (!callOutcome) return false;
		if (!mustShowFollowSteps) return !!leadQuality;
		if (!watchedAssets || !pitched || !shownOutcome) return false;
		if (won) {
			if (!cashCollected || !totalSalesValue) return false;
		}
		if (isFollowUp) {
			return !!leadQuality && !!followUpAt;
		}
		if (objections.length === 0 || !leadQuality) return false;
		return true;
	}, [callOutcome, mustShowFollowSteps, watchedAssets, pitched, shownOutcome, won, isFollowUp, cashCollected, totalSalesValue, objections, leadQuality, followUpAt]);

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
			followUpAt: isFollowUp && followUpAt ? followUpAt : null,
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

				{(!mustShowFollowSteps) ? (
					<LeadQualitySection leadQuality={leadQuality} setLeadQuality={setLeadQuality} />
				) : (
					<>
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

						{isFollowUp && (
							<div className="space-y-2">
								<Label>Follow Up Date & Time</Label>
								<DateTimePicker value={followUpAt || null} onChange={(iso) => setFollowUpAt(iso || "")} />
							</div>
						)}

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

						{!isFollowUp && (
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
						)}

						<LeadQualitySection leadQuality={leadQuality} setLeadQuality={setLeadQuality} />
					</>
				)}

				<Separator />

				<div className="flex items-center justify-end gap-3">
					<Button disabled={!canSubmit} onClick={handleSubmit} size="lg" className="gap-2">
						Complete & Continue <ChevronRight className="h-4 w-4" />
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

function FollowUpEntryCard({ item, onComplete }: { item: FollowUpItem; onComplete: () => void }) {
	const [result, setResult] = useState<"won" | "lost" | "">("");
	const [cashCollected, setCashCollected] = useState("");
	const [totalSalesValue, setTotalSalesValue] = useState("");
	const [objections, setObjections] = useState<string[]>([]);
	const [leadQuality, setLeadQuality] = useState("");
	const [watched, setWatched] = useState<"true" | "false" | "">("");
	const [pitched, setPitched] = useState<"true" | "false" | "">("");

	const won = result === 'won';
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
		try {
			const res = await fetch('/api/appointments/follow-up', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ appointmentId: item.id, payload })
			});
			if (!res.ok) throw new Error(await res.text());
			onComplete();
		} catch (e) {
			console.error('Failed to save follow-up result', e);
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
							<CardTitle className="text-lg">Follow Up: {item.leadName}</CardTitle>
							<CardDescription>Scheduled: {new Date(item.followUpAt).toLocaleString()}</CardDescription>
						</div>
					</div>
					<Badge variant="secondary">follow up</Badge>
				</div>
			</CardHeader>
			<CardContent className="space-y-5">
				<div className="space-y-2">
					<Label>Result</Label>
					<Select value={result} onValueChange={(v: 'won' | 'lost') => setResult(v)}>
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

				<div className="flex items-center justify-end gap-3">
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
	const [callOutcome, setCallOutcome] = useState<'show' | 'no_show' | 'reschedule' | 'cancel' | "">("");
	const [shownOutcome, setShownOutcome] = useState<'booked' | 'not_booked' | "">("");
	const [leadQuality, setLeadQuality] = useState<string>("");

	const mustShowFollowSteps = callOutcome === "show";

	const canSubmit = useMemo(() => {
		if (!callOutcome) return false;
		if (!mustShowFollowSteps) return true; // For no show, reschedule, cancel - just call outcome is enough
		// For show - need shown outcome
		return !!shownOutcome;
	}, [callOutcome, mustShowFollowSteps, shownOutcome]);

	const handleSubmit = async () => {
		if (!canSubmit) return;
		const payload = {
			callOutcome,
			shownOutcome: shownOutcome || undefined,
			leadQuality: leadQuality ? Number(leadQuality) : undefined,
		};
		try {
			const res = await fetch('/api/discoveries/outcome', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ discoveryId: item.id, payload })
			});
			if (!res.ok) throw new Error(await res.text());
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
				<div className="space-y-2">
					<Label>Call Outcome</Label>
					<Select value={callOutcome} onValueChange={(v: 'show' | 'no_show' | 'reschedule' | 'cancel') => setCallOutcome(v)}>
						<SelectTrigger><SelectValue placeholder="Select outcome" /></SelectTrigger>
						<SelectContent>
							<SelectItem value="show">Show</SelectItem>
							<SelectItem value="no_show">No Show</SelectItem>
							<SelectItem value="reschedule">Reschedule</SelectItem>
							<SelectItem value="cancel">Cancel</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{mustShowFollowSteps && (
					<div className="space-y-2">
						<Label>Shown Outcome</Label>
						<Select value={shownOutcome} onValueChange={(v: 'booked' | 'not_booked') => setShownOutcome(v)}>
							<SelectTrigger><SelectValue placeholder="Select result" /></SelectTrigger>
							<SelectContent>
								<SelectItem value="booked">Booked</SelectItem>
								<SelectItem value="not_booked">Not Booked</SelectItem>
							</SelectContent>
						</Select>
					</div>
				)}

				<div className="space-y-2">
					<Label>Lead Quality (Optional)</Label>
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

				<Separator />

				<div className="flex items-center justify-end gap-3">
					<Button disabled={!canSubmit} onClick={handleSubmit} size="lg" className="gap-2">
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