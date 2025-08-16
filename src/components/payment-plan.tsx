"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { DateTimePicker } from "@/components/ui/date-time-picker";

interface PaymentRow {
	id?: string;
	payment_date: string;
	amount: string;
	paid: boolean;
	isNew?: boolean;
}

export function PaymentPlan({ appointmentId, totalSalesValue, cashCollected }: { appointmentId: string; totalSalesValue: number; cashCollected: number; }) {
	const [rows, setRows] = useState<PaymentRow[]>([]);
	const [loading, setLoading] = useState<boolean>(false);
	const [initialized, setInitialized] = useState<boolean>(false);

	const collected = useMemo(() => rows.filter(r => r.paid).reduce((s, r) => s + (Number(r.amount) || 0), 0), [rows]);
	const remaining = Math.max(0, Number(totalSalesValue || 0) - Number(collected || 0));

	useEffect(() => {
		const fetchRows = async () => {
			setLoading(true);
			try {
				const res = await fetch(`/api/appointments/payments?appointmentId=${appointmentId}`);
				const data = await res.json();
				if (res.ok) {
					const mapped: PaymentRow[] = (data.payments || []).map((p: any) => ({ id: p.id, payment_date: p.payment_date, amount: String(p.amount ?? ''), paid: !!p.paid }));
					setRows(mapped);
					setInitialized(mapped.length > 0);
				} else {
					setRows([]);
				}
			} finally {
				setLoading(false);
			}
		};
		fetchRows();
	}, [appointmentId]);

	const ensureInitialized = async () => {
		if (initialized) return;
		const res = await fetch('/api/appointments/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'init', appointmentId }) });
		if (res.ok) {
			setInitialized(true);
			const r = await fetch(`/api/appointments/payments?appointmentId=${appointmentId}`);
			const j = await r.json();
			const mapped: PaymentRow[] = (j.payments || []).map((p: any) => ({ id: p.id, payment_date: p.payment_date, amount: String(p.amount ?? ''), paid: !!p.paid }));
			setRows(mapped);
		}
	};

	useEffect(() => {
		ensureInitialized();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [initialized]);

	const addRow = () => {
		setRows(prev => [...prev, { isNew: true, payment_date: new Date().toISOString(), amount: '', paid: false }]);
	};

	const saveRow = async (idx: number) => {
		const row = rows[idx];
		if (!row) return;
		if (row.id) {
			await fetch('/api/appointments/payments', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: row.id, changes: { payment_date: row.payment_date, amount: Number(row.amount || 0), paid: row.paid } }) });
		} else {
			await fetch('/api/appointments/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', appointmentId, payment: { payment_date: row.payment_date, amount: Number(row.amount || 0), paid: row.paid } }) });
		}
		// reload
		const r = await fetch(`/api/appointments/payments?appointmentId=${appointmentId}`);
		const j = await r.json();
		const mapped: PaymentRow[] = (j.payments || []).map((p: any) => ({ id: p.id, payment_date: p.payment_date, amount: String(p.amount ?? ''), paid: !!p.paid }));
		setRows(mapped);
	};

	const deleteRow = async (id?: string, idx?: number) => {
		if (id) {
			await fetch(`/api/appointments/payments?id=${id}`, { method: 'DELETE' });
			const r = await fetch(`/api/appointments/payments?appointmentId=${appointmentId}`);
			const j = await r.json();
			const mapped: PaymentRow[] = (j.payments || []).map((p: any) => ({ id: p.id, payment_date: p.payment_date, amount: String(p.amount ?? ''), paid: !!p.paid }));
			setRows(mapped);
		} else if (typeof idx === 'number') {
			setRows(prev => prev.filter((_, i) => i !== idx));
		}
	};

	return (
		<Card className="border shadow-sm">
			<CardHeader>
				<CardTitle className="text-base">Payment Plan</CardTitle>
				<CardDescription>Manual schedule of payments</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
					<div className="rounded-md border p-3">
						<div className="text-xs text-muted-foreground">Total Sales Value</div>
						<div className="text-lg font-medium">${totalSalesValue.toFixed(2)}</div>
					</div>
					<div className="rounded-md border p-3">
						<div className="text-xs text-muted-foreground">Collected</div>
						<div className="text-lg font-medium">${collected.toFixed(2)}</div>
					</div>
					<div className="rounded-md border p-3">
						<div className="text-xs text-muted-foreground">Remaining</div>
						<div className="text-lg font-medium">${remaining.toFixed(2)}</div>
					</div>
				</div>

				<Separator />

				<div className="flex items-center justify-between">
					<div className="font-medium">Payments</div>
					<Button size="sm" onClick={addRow}>Add Payment</Button>
				</div>

				<div className="space-y-2">
					<div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground">
						<div className="col-span-4">Payment Date</div>
						<div className="col-span-4">Amount</div>
						<div className="col-span-2">Paid</div>
						<div className="col-span-2">Actions</div>
					</div>
					{rows.map((row, idx) => (
						<div className="grid grid-cols-12 gap-2 items-center" key={row.id || `new-${idx}`}>
							<div className="col-span-4">
								<DateTimePicker value={row.payment_date} onChange={(iso) => setRows(prev => prev.map((r, i) => i === idx ? { ...r, payment_date: iso || '' } : r))} />
							</div>
							<div className="col-span-4">
								<Input type="number" inputMode="decimal" value={row.amount} onChange={(e) => setRows(prev => prev.map((r, i) => i === idx ? { ...r, amount: e.target.value } : r))} placeholder="0.00" />
							</div>
							<div className="col-span-2">
								<div className="flex items-center gap-2">
									<Checkbox checked={row.paid} onCheckedChange={(v) => setRows(prev => prev.map((r, i) => i === idx ? { ...r, paid: !!v } : r))} />
									<Label className="text-xs">Paid</Label>
								</div>
							</div>
							<div className="col-span-2 flex items-center gap-2">
								<Button size="sm" variant="secondary" onClick={() => saveRow(idx)}>Save</Button>
								<Button size="sm" variant="destructive" onClick={() => row.id ? deleteRow(row.id) : deleteRow(undefined, idx)}>Delete</Button>
							</div>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
} 