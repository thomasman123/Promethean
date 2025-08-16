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
import { useAuth } from "@/hooks/useAuth";
import { Calendar, ClipboardList, CheckCircle2 } from "lucide-react";

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

export default function DataUpdateFlowPage() {
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

	const handlePrevious = () => {
		if (currentIndex > 0) {
			setCurrentIndex(prev => prev - 1);
		}
	};

	const handleNext = () => {
		if (currentIndex < allItems.length - 1) {
			setCurrentIndex(prev => prev + 1);
		}
	};

	if (isFlowComplete) {
		return (
			<div className="p-6 space-y-6">
				<div className="rounded-lg bg-green-50 border border-green-200 p-6 text-center">
					<CheckCircle2 className="mx-auto h-16 w-16 text-green-600 mb-4" />
					<h1 className="text-2xl font-bold text-green-900">Data Updates Complete!</h1>
					<p className="text-green-700 mt-2">You've successfully completed all assigned data updates.</p>
					<Button className="mt-4" onClick={() => window.location.href = '/dashboard/update-data'}>
						Return to Update Data
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
					<Button className="mt-4" onClick={() => window.location.href = '/dashboard/update-data'}>
						Return to Update Data
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="p-6 space-y-6">
			{/* Progress Header */}
			<div className="rounded-lg bg-primary/10 border p-6">
				<div className="flex items-center justify-between mb-4">
					<h1 className="text-2xl font-bold">Data Update Flow</h1>
					<Badge variant="outline">
						{completedCount} of {totalItems} completed
					</Badge>
				</div>
				<Progress value={progress} className="mb-2" />
				<p className="text-sm text-muted-foreground">
					Complete all assigned data updates in one guided flow
				</p>
			</div>

			{/* Current Item */}
			{currentItem && (
				<Card>
					<CardHeader>
						<div className="flex items-center gap-2">
							{currentItem.type === "appointment" ? (
								<Calendar className="h-5 w-5" />
							) : (
								<ClipboardList className="h-5 w-5" />
							)}
							<CardTitle className="text-base">
								{currentItem.type === "appointment" ? "Appointment" : "Discovery"}: {currentItem.leadName}
							</CardTitle>
							{completedItems.has(currentItem.id) && (
								<CheckCircle2 className="h-5 w-5 text-green-600" />
							)}
						</div>
						<CardDescription>
							Scheduled: {new Date(currentItem.scheduledAt).toLocaleString()}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex gap-2">
							<Button
								variant="outline"
								onClick={handlePrevious}
								disabled={currentIndex === 0}
							>
								Previous
							</Button>
							{completedItems.has(currentItem.id) ? (
								<Button variant="outline" onClick={handleNext} disabled={currentIndex === allItems.length - 1}>
									Next
								</Button>
							) : (
								<DataUpdateSheet
									item={currentItem}
									onComplete={() => handleItemComplete(currentItem.id)}
								/>
							)}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Overview of all items */}
			<div>
				<h2 className="text-lg font-semibold mb-3">All Items</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
					{allItems.map((item, index) => (
						<Card 
							key={item.id} 
							className={`cursor-pointer transition-colors ${
								index === currentIndex ? 'ring-2 ring-primary' : ''
							} ${completedItems.has(item.id) ? 'bg-green-50' : ''}`}
							onClick={() => setCurrentIndex(index)}
						>
							<CardContent className="p-4">
								<div className="flex items-center gap-2">
									{item.type === "appointment" ? (
										<Calendar className="h-4 w-4" />
									) : (
										<ClipboardList className="h-4 w-4" />
									)}
									<span className="text-sm font-medium">{item.leadName}</span>
									{completedItems.has(item.id) && (
										<CheckCircle2 className="h-4 w-4 text-green-600 ml-auto" />
									)}
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</div>
	);
}

function DataUpdateSheet({ item, onComplete }: { item: DataItem; onComplete: () => void }) {
	const [open, setOpen] = useState(false);

	if (item.type === "appointment") {
		return (
			<>
				<Button onClick={() => setOpen(true)}>Update Appointment</Button>
				<AppointmentSheet 
					open={open} 
					onOpenChange={setOpen} 
					item={item} 
					onComplete={() => {
						setOpen(false);
						onComplete();
					}}
				/>
			</>
		);
	} else {
		return (
			<>
				<Button onClick={() => setOpen(true)}>Update Discovery</Button>
				<DiscoverySheet 
					open={open} 
					onOpenChange={setOpen} 
					item={item} 
					onComplete={() => {
						setOpen(false);
						onComplete();
					}}
				/>
			</>
		);
	}
}

function AppointmentSheet({ 
	open, 
	onOpenChange, 
	item, 
	onComplete 
}: { 
	open: boolean; 
	onOpenChange: (v: boolean) => void; 
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
	const [objection, setObjection] = useState<string>("");
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
		if (!objection || !leadQuality) return false;
		return true;
	}, [callOutcome, mustShowFollowSteps, watchedAssets, pitched, shownOutcome, won, isFollowUp, cashCollected, totalSalesValue, objection, leadQuality, followUpAt]);

	const reset = () => {
		setCallOutcome("");
		setWatchedAssets("");
		setPitched("");
		setShownOutcome("");
		setCashCollected("");
		setTotalSalesValue("");
		setObjection("");
		setLeadQuality("");
		setFollowUpAt("");
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
			followUpAt: isFollowUp && followUpAt ? followUpAt : null,
		};
		try {
			const res = await fetch('/api/appointments/outcome', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ appointmentId: item.id, payload })
			});
			if (!res.ok) throw new Error(await res.text());
			reset();
			onComplete();
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

							{/* Step 5: Follow Up At if chosen */}
							{isFollowUp && (
								<div className="space-y-2">
									<Label>Follow Up Date & Time</Label>
									<Input type="datetime-local" value={followUpAt} onChange={(e) => setFollowUpAt(e.target.value)} />
								</div>
							)}

							{/* Step 6: Cash Details if Won */}
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

							{/* Step 7: Objections */}
							{!isFollowUp && (
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
							)}

							{/* Step 8: Lead Quality */}
							<LeadQualitySection leadQuality={leadQuality} setLeadQuality={setLeadQuality} />
						</>
					)}

					<Separator />

					<div className="flex justify-end gap-2">
						<Button variant="ghost" onClick={() => { onOpenChange(false); reset(); }}>Cancel</Button>
						<Button disabled={!canSubmit} onClick={handleSubmit}>Complete & Continue</Button>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}

function DiscoverySheet({ 
	open, 
	onOpenChange, 
	item, 
	onComplete 
}: { 
	open: boolean; 
	onOpenChange: (v: boolean) => void; 
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
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="max-h-[92vh] overflow-auto w-full sm:max-w-2xl" side="right">
				<SheetHeader>
					<SheetTitle>Update Discovery</SheetTitle>
					<SheetDescription>{item.leadName}</SheetDescription>
				</SheetHeader>
				<div className="p-4 space-y-4">
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

					<div className="flex justify-end gap-2">
						<Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
						<Button disabled={!outcome} onClick={handleSubmit}>Complete & Continue</Button>
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