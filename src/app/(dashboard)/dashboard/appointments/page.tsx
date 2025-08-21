"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

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

	useEffect(() => {
		async function load() {
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

				// Fetch contacts in batch and map by id
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

				setRows(baseRows.map(r => ({
					...r,
					contacts: r.contact_id ? contactMap[r.contact_id] || null : null,
				})));

				// Load sales reps for filter (from profiles with access to account or via team view)
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
		load();
	}, [selectedAccountId]);

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
		<div className="p-6 space-y-4 max-w-full overflow-x-hidden">
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
				<CardContent className="relative max-w-full">
					<DataTable columns={columns} data={filteredRows} globalFilterPlaceholder="Search appointments..." />
				</CardContent>
			</Card>
		</div>
	);
} 