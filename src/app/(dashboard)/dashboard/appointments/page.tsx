"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

interface AppointmentRow {
	id: string;
	date_booked_for: string;
	setter: string | null;
	sales_rep: string | null;
	sales_rep_user_id: string | null;
	call_outcome: string | null;
	show_outcome: string | null;
	cash_collected: number | null;
	total_sales_value: number | null;
	lead_quality: number | null;
	linked_discovery_id: string | null;
	contact_id: string | null;
	contacts?: {
		name: string | null;
		email: string | null;
		phone: string | null;
	} | null;
}

export default function AppointmentsTablePage() {
	const { selectedAccountId } = useAuth();
	const [rows, setRows] = useState<AppointmentRow[]>([]);
	const [loading, setLoading] = useState(false);
	const [salesReps, setSalesReps] = useState<{ id: string; name: string }[]>([]);
	const [repFilter, setRepFilter] = useState<string>("all");
	const [openId, setOpenId] = useState<string | null>(null);

	const refresh = async () => {
		if (!selectedAccountId) return;
		setLoading(true);
		try {
			const { data: appts, error } = await supabase
				.from("appointments")
				.select(
					"id,date_booked_for,setter,sales_rep,sales_rep_user_id,call_outcome,show_outcome,cash_collected,total_sales_value,lead_quality,linked_discovery_id,contact_id"
				)
				.eq("account_id", selectedAccountId)
				.order("date_booked_for", { ascending: false });
			if (error) throw error;
			const baseRows: AppointmentRow[] = (appts as any) || [];
			const contactIds = Array.from(new Set(baseRows.map(r => r.contact_id).filter(Boolean))) as string[];
			let contactMap: Record<string, { name: string | null; email: string | null; phone: string | null }> = {};
			if (contactIds.length > 0) {
				const { data: contactsData } = await supabase
					.from("contacts")
					.select("id,name,email,phone")
					.in("id", contactIds);
				for (const c of contactsData || []) {
					contactMap[(c as any).id] = { name: (c as any).name, email: (c as any).email, phone: (c as any).phone };
				}
			}
			setRows(baseRows.map(r => ({ ...r, contacts: r.contact_id ? contactMap[r.contact_id] || null : null })));

			const resp = await fetch(`/api/team?accountId=${selectedAccountId}`);
			if (resp.ok) {
				const json = await resp.json();
				const list = (json.members || []).map((m: any) => ({ id: m.user_id || m.id, name: m.full_name || m.name || m.email }));
				setSalesReps(list);
			}
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => { refresh(); }, [selectedAccountId]);

	const filteredRows = useMemo(() => {
		if (repFilter === "all") return rows;
		return rows.filter((r) => r.sales_rep_user_id === repFilter || r.sales_rep === repFilter);
	}, [rows, repFilter]);

	const columns: ColumnDef<AppointmentRow>[] = [
		{
			accessorKey: "date_booked_for",
			header: "When",
			cell: ({ row }) => new Date(row.original.date_booked_for).toLocaleString(),
		},
		{
			accessorKey: "contacts.name",
			header: "Contact",
			cell: ({ row }) => row.original.contacts?.name || "-",
		},
		{
			accessorKey: "contacts.email",
			header: "Email",
			cell: ({ row }) => row.original.contacts?.email || "-",
		},
		{
			accessorKey: "contacts.phone",
			header: "Phone",
			cell: ({ row }) => row.original.contacts?.phone || "-",
		},
		{ accessorKey: "setter", header: "Setter" },
		{
			accessorKey: "sales_rep",
			header: "Sales Rep",
			cell: ({ row }) => {
				const r = row.original;
				const name = r.sales_rep || salesReps.find((s) => s.id === r.sales_rep_user_id)?.name || "-";
				return name;
			},
		},
		{
			accessorKey: "call_outcome",
			header: "Call",
			cell: ({ row }) => (row.original.call_outcome ? <Badge variant="secondary">{row.original.call_outcome}</Badge> : "-"),
		},
		{
			accessorKey: "show_outcome",
			header: "Show",
			cell: ({ row }) => (row.original.show_outcome ? <Badge>{row.original.show_outcome}</Badge> : "-"),
		},
		{
			accessorKey: "cash_collected",
			header: "Cash",
			cell: ({ row }) => (row.original.cash_collected != null ? `$${Number(row.original.cash_collected).toFixed(2)}` : "-"),
		},
		{
			accessorKey: "total_sales_value",
			header: "Total",
			cell: ({ row }) => (row.original.total_sales_value != null ? `$${Number(row.original.total_sales_value).toFixed(2)}` : "-"),
		},
		{ accessorKey: "lead_quality", header: "Quality" },
		{ accessorKey: "linked_discovery_id", header: "Discovery" },
		{ accessorKey: "contact_id", header: "Contact ID" },
	];

	return (
		<div className="p-6 space-y-4 max-w-full overflow-x-hidden min-h-0">
			<Card className="max-w-full overflow-hidden">
				<CardHeader className="flex flex-row items-center justify-between">
					<div>
						<CardTitle>Appointments</CardTitle>
						<CardDescription>Search, filter, and explore how each appointment ties together.</CardDescription>
					</div>
					<div className="flex items-center gap-2">
						<Select value={repFilter} onValueChange={setRepFilter}>
							<SelectTrigger className="w-[220px]"><SelectValue placeholder="Filter by sales rep" /></SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All reps</SelectItem>
								{salesReps.map((r) => (
									<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</CardHeader>
				<CardContent className="relative max-w-full min-h-0">
					<DataTable columns={columns} data={filteredRows} globalFilterPlaceholder="Search appointments..." bodyMaxHeight="65vh" onRowClick={(r) => setOpenId(r.id)} />
				</CardContent>
			</Card>
			{openId && (
				<AppointmentEditSheet 
					open={!!openId} 
					onOpenChange={(v) => !v && setOpenId(null)} 
					appointment={rows.find(r => r.id === openId)!}
					onSaved={() => { setOpenId(null); refresh(); }}
				/>
			)}
		</div>
	);
}

function AppointmentEditSheet({ open, onOpenChange, appointment, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; appointment: AppointmentRow; onSaved: () => void }) {
	const [callOutcome, setCallOutcome] = useState<"show" | "no_show" | "reschedule" | "cancel" | "">(appointment.call_outcome as any || "");
	const [watchedAssets, setWatchedAssets] = useState<"true" | "false" | "">(((appointment as any) && (appointment as any).watched_assets) ? "true" : "");
	const [pitched, setPitched] = useState<"true" | "false" | "">(((appointment as any) && (appointment as any).pitched) ? "true" : "");
	const [shownOutcome, setShownOutcome] = useState<"won" | "lost" | "follow_up" | "">((appointment.show_outcome as any) || "");
	const [cashCollected, setCashCollected] = useState<string>(appointment.cash_collected != null ? String(appointment.cash_collected) : "");
	const [totalSalesValue, setTotalSalesValue] = useState<string>(appointment.total_sales_value != null ? String(appointment.total_sales_value) : "");
	const [objection, setObjection] = useState<string>("");
	const [leadQuality, setLeadQuality] = useState<string>(appointment.lead_quality != null ? String(appointment.lead_quality) : "");

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
		if (isFollowUp) return !!leadQuality; // Follow up scheduled elsewhere
		if (!objection || !leadQuality) return false;
		return true;
	}, [callOutcome, mustShowFollowSteps, watchedAssets, pitched, shownOutcome, won, isFollowUp, cashCollected, totalSalesValue, objection, leadQuality]);

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
			leadQuality: leadQuality ? Number(leadQuality) : undefined,
		};
		try {
			const res = await fetch('/api/appointments/outcome', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ appointmentId: appointment.id, payload })
			});
			if (!res.ok) throw new Error(await res.text());
			onOpenChange(false);
			onSaved();
		} catch (e) {
			console.error('Failed to save outcome', e);
		}
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="max-h-[92vh] overflow-auto w-full sm:max-w-2xl" side="right">
				<SheetHeader>
					<SheetTitle>Edit Appointment</SheetTitle>
					<SheetDescription>{appointment.contacts?.name || appointment.contact_id}</SheetDescription>
				</SheetHeader>
				<div className="p-4 space-y-4">
					<div className="space-y-2">
						<Label>Call Outcome</Label>
						<Select value={callOutcome} onValueChange={(v: any) => setCallOutcome(v)}>
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
								<Select value={shownOutcome} onValueChange={(v: any) => setShownOutcome(v)}>
									<SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
									<SelectContent>
										<SelectItem value="won">Won</SelectItem>
										<SelectItem value="lost">Lost</SelectItem>
										<SelectItem value="follow_up">Follow Up</SelectItem>
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
									{needsPlan && (
										<div className="md:col-span-2 p-3 rounded-md border">
											<div className="text-sm font-medium">Payment Plan Builder</div>
											<p className="text-xs text-muted-foreground">Cash collected is less than total sales value. Configure a payment plan (placeholder).</p>
										</div>
									)}
								</div>
							)}

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

							<LeadQualitySection leadQuality={leadQuality} setLeadQuality={setLeadQuality} />
						</>
					)}

					<Separator />

					<div className="flex justify-end gap-2">
						<Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
						<Button disabled={!canSubmit} onClick={handleSubmit}>Save</Button>
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
				<SelectTrigger><SelectValue placeholder="Select quality" /></SelectTrigger>
				<SelectContent>
					<SelectItem value="1">1 (Lowest)</SelectItem>
					<SelectItem value="2">2</SelectItem>
					<SelectItem value="3">3</SelectItem>
					<SelectItem value="4">4</SelectItem>
					<SelectItem value="5">5 (Highest)</SelectItem>
				</SelectContent>
			</Select>
		</div>
	);
} 