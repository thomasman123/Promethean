"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Calendar, DollarSign, Plus, Trash2, Check } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useAccountTimezone } from "@/hooks/use-account-timezone";
import { useDashboard } from "@/lib/dashboard-context";
import { useToast } from "@/hooks/use-toast";

interface PaymentRow {
	id?: string;
	payment_date: string;
	amount: string;
	paid: boolean;
	isNew?: boolean;
}

interface PaymentPlanProps {
	appointmentId: string;
	totalSalesValue: number;
	cashCollected: number;
	onPaymentUpdate?: () => void;
}

export function PaymentPlan({ appointmentId, totalSalesValue, cashCollected, onPaymentUpdate }: PaymentPlanProps) {
	const [rows, setRows] = useState<PaymentRow[]>([]);
	const [loading, setLoading] = useState<boolean>(false);
	const [initialized, setInitialized] = useState<boolean>(false);
	const [saving, setSaving] = useState<string | null>(null);

	const { selectedAccountId } = useDashboard();
	const { formatDate } = useAccountTimezone(selectedAccountId);
	const { toast } = useToast();

	// Calculate collected amount from paid payments
	const collected = useMemo(() => {
		return rows.filter(r => r.paid).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
	}, [rows]);

	// If no payments exist yet, use the cashCollected from the appointment
	// Otherwise use the actual payments data
	const actualCollected = rows.length === 0 ? cashCollected : collected;
	const remaining = Math.max(0, Number(totalSalesValue || 0) - Number(actualCollected || 0));
	const isComplete = remaining === 0;

	// Calculate total scheduled to check if we can add more payments
	const totalScheduled = rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
	const canAddMorePayments = totalScheduled < totalSalesValue;

	// Load existing payments
	useEffect(() => {
		const fetchRows = async () => {
			setLoading(true);
			try {
				const res = await fetch(`/api/appointments/payments?appointmentId=${appointmentId}`);
				const data = await res.json();
				if (res.ok) {
					const mapped: PaymentRow[] = (data.payments || []).map((p: any) => ({ 
						id: p.id, 
						payment_date: p.payment_date, 
						amount: String(p.amount ?? ''), 
						paid: !!p.paid 
					}));
					setRows(mapped);
					setInitialized(true); // Always mark as initialized after loading, regardless of payment count
				} else {
					setRows([]);
				}
			} catch (error) {
				console.error('Failed to fetch payments:', error);
				setRows([]);
			} finally {
				setLoading(false);
			}
		};
		fetchRows();
	}, [appointmentId]);

	// Initialize with cash collected amount if no payments exist
	const ensureInitialized = async () => {
		console.log('🔍 [PaymentPlan] ensureInitialized called:', {
			initialized,
			rowsLength: rows.length,
			cashCollected,
			appointmentId
		});
		
		// Don't initialize if already initialized OR if payments already exist
		if (initialized || rows.length > 0) {
			console.log('🚫 [PaymentPlan] Skipping initialization - already done or payments exist');
			return;
		}
		
		// If there's cash collected and no payments exist, automatically add it as the first payment (marked as paid)
		if (cashCollected > 0) {
			console.log('💰 [PaymentPlan] Auto-initializing with cash collected:', cashCollected);
			try {
				const res = await fetch('/api/appointments/payments', { 
					method: 'POST', 
					headers: { 'Content-Type': 'application/json' }, 
					body: JSON.stringify({ action: 'init', appointmentId }) 
				});
				if (res.ok) {
					console.log('✅ [PaymentPlan] Init API call successful');
					setInitialized(true);
					// Refresh the data
					const refreshRes = await fetch(`/api/appointments/payments?appointmentId=${appointmentId}`);
					const refreshData = await refreshRes.json();
					if (refreshRes.ok) {
						console.log('✅ [PaymentPlan] Refresh successful, payments:', refreshData.payments);
						const mapped: PaymentRow[] = (refreshData.payments || []).map((p: any) => ({ 
							id: p.id, 
							payment_date: p.payment_date, 
							amount: String(p.amount ?? ''), 
							paid: !!p.paid 
						}));
						setRows(mapped);
						onPaymentUpdate?.();
					} else {
						console.error('❌ [PaymentPlan] Refresh failed:', refreshData);
					}
				} else {
					const errorData = await res.json();
					console.error('❌ [PaymentPlan] Init API call failed:', errorData);
				}
			} catch (error) {
				console.error('Failed to initialize payments:', error);
			}
		} else {
			setInitialized(true);
		}
	};

	useEffect(() => {
		// Only try to initialize after we've loaded existing payments and not already initialized
		if (!loading && !initialized && rows.length === 0 && cashCollected > 0) {
			ensureInitialized();
		}
	}, [loading, initialized, rows.length, cashCollected]);

	const addRow = () => {
		// Calculate total scheduled payments
		const totalScheduled = rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
		
		// Don't allow adding more payments if already at or above total sales value
		if (totalScheduled >= totalSalesValue) {
			toast({
				title: "Cannot Add Payment",
				description: "Total scheduled payments already equal or exceed the total sales value.",
				variant: "destructive",
			});
			return;
		}

		const newRow: PaymentRow = {
			payment_date: new Date().toISOString(),
			amount: String(remaining > 0 ? remaining : 0),
			paid: false,
			isNew: true
		};
		setRows(prev => [...prev, newRow]);
	};

	const updateRow = async (idx: number, updates: Partial<PaymentRow>) => {
		const row = rows[idx];
		const updatedRow = { ...row, ...updates };
		
		// Update local state immediately for better UX
		setRows(prev => prev.map((r, i) => i === idx ? updatedRow : r));

		// If it's a new row, create it
		if (row.isNew) {
			try {
				setSaving(`new-${idx}`);
				const res = await fetch('/api/appointments/payments', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						action: 'create',
						appointmentId,
						payment: {
							payment_date: updatedRow.payment_date,
							amount: Number(updatedRow.amount),
							paid: updatedRow.paid
						}
					})
				});

				if (res.ok) {
					// Refresh to get the ID
					const refreshRes = await fetch(`/api/appointments/payments?appointmentId=${appointmentId}`);
					const refreshData = await refreshRes.json();
					if (refreshRes.ok) {
						const mapped: PaymentRow[] = (refreshData.payments || []).map((p: any) => ({ 
							id: p.id, 
							payment_date: p.payment_date, 
							amount: String(p.amount ?? ''), 
							paid: !!p.paid 
						}));
						setRows(mapped);
						onPaymentUpdate?.();
					}
				}
			} catch (error) {
				console.error('Failed to create payment:', error);
			} finally {
				setSaving(null);
			}
		} else if (row.id) {
			// Update existing row
			try {
				setSaving(row.id);
				const res = await fetch('/api/appointments/payments', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						id: row.id,
						changes: {
							payment_date: updatedRow.payment_date,
							amount: Number(updatedRow.amount),
							paid: updatedRow.paid
						}
					})
				});

				if (res.ok) {
					onPaymentUpdate?.();
				}
			} catch (error) {
				console.error('Failed to update payment:', error);
			} finally {
				setSaving(null);
			}
		}
	};

	const deleteRow = async (idx: number) => {
		const row = rows[idx];
		
		if (row.isNew) {
			// Just remove from local state if it's new
			setRows(prev => prev.filter((_, i) => i !== idx));
			return;
		}

		if (row.id) {
			try {
				const res = await fetch(`/api/appointments/payments?id=${row.id}`, {
					method: 'DELETE'
				});

				if (res.ok) {
					setRows(prev => prev.filter((_, i) => i !== idx));
					onPaymentUpdate?.();
				}
			} catch (error) {
				console.error('Failed to delete payment:', error);
			}
		}
	};

	if (loading) {
		return (
			<Card className="border shadow-sm">
				<CardHeader>
					<CardTitle className="text-base">Payment Plan</CardTitle>
					<CardDescription>Loading payment schedule...</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="animate-pulse space-y-4">
						<div className="h-4 bg-muted rounded"></div>
						<div className="h-4 bg-muted rounded w-3/4"></div>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="border shadow-sm">
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="text-base flex items-center gap-2">
							<DollarSign className="h-4 w-4" />
							Payment Plan
							{isComplete && <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">Complete</Badge>}
						</CardTitle>
						<CardDescription>Manage payment schedule and track progress</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Summary Cards */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
					<div className="rounded-lg border p-3 bg-slate-50">
						<div className="text-xs font-medium text-slate-600 mb-1">Total Sales Value</div>
						<div className="text-lg font-bold text-slate-900">${totalSalesValue.toFixed(2)}</div>
					</div>
					<div className="rounded-lg border p-3 bg-emerald-50">
						<div className="text-xs font-medium text-emerald-700 mb-1">Collected</div>
						<div className="text-lg font-bold text-emerald-800">${actualCollected.toFixed(2)}</div>
					</div>
					<div className={cn(
						"rounded-lg border p-3",
						remaining > 0 ? "bg-amber-50" : "bg-emerald-50"
					)}>
						<div className={cn(
							"text-xs font-medium mb-1",
							remaining > 0 ? "text-amber-700" : "text-emerald-700"
						)}>
							Remaining
						</div>
						<div className={cn(
							"text-lg font-bold",
							remaining > 0 ? "text-amber-800" : "text-emerald-800"
						)}>
							${remaining.toFixed(2)}
						</div>
					</div>
				</div>

				{remaining > 0 && (
					<Alert>
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>
							${remaining.toFixed(2)} remaining to be collected. Add payment installments below.
						</AlertDescription>
					</Alert>
				)}

				<Separator />

				{/* Payment Rows */}
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<div className="font-medium flex items-center gap-2">
							<Calendar className="h-4 w-4" />
							Payment Schedule
						</div>
						<Button 
							size="sm" 
							onClick={addRow} 
							className="gap-2"
							disabled={!canAddMorePayments}
						>
							<Plus className="h-4 w-4" />
							Add Payment
						</Button>
					</div>

					{!canAddMorePayments && totalScheduled >= totalSalesValue && (
						<Alert>
							<AlertCircle className="h-4 w-4" />
							<AlertDescription>
								Cannot add more payments. Total scheduled (${totalScheduled.toFixed(2)}) equals or exceeds total sales value (${totalSalesValue.toFixed(2)}).
							</AlertDescription>
						</Alert>
					)}

					{rows.length === 0 ? (
						<div className="text-center py-6 text-muted-foreground">
							<Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
							<p>No payments scheduled</p>
							<p className="text-xs">Click "Add Payment" to create your first installment</p>
						</div>
					) : (
						<div className="space-y-3">
							{rows.map((row, idx) => (
								<div key={row.id || idx} className={cn(
									"p-4 border rounded-lg transition-all",
									row.paid ? "bg-emerald-50 border-emerald-200" : "bg-background",
									saving === row.id || saving === `new-${idx}` ? "opacity-50" : ""
								)}>
									<div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
										<div className="space-y-2 md:col-span-2">
											<Label className="text-xs font-medium">Due Date</Label>
											<DateTimePicker
												value={row.payment_date}
												onChange={(date) => date && updateRow(idx, { payment_date: date })}
												placeholder="Select date"
											/>
										</div>
										
										<div className="space-y-2">
											<Label className="text-xs font-medium">Amount Due</Label>
											<div className="relative">
												<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
												<Input
													type="number"
													step="0.01"
													value={row.amount}
													onChange={(e) => updateRow(idx, { amount: e.target.value })}
													className="pl-8"
													placeholder="0.00"
													inputMode="numeric"
													pattern="[0-9]*"
												/>
											</div>
										</div>

										<div className="space-y-2">
											<Label className="text-xs font-medium">Status</Label>
											<div className="flex items-center space-x-2 h-10">
												<Checkbox
													id={`paid-${idx}`}
													checked={row.paid}
													onCheckedChange={(checked) => updateRow(idx, { paid: !!checked })}
												/>
												<Label htmlFor={`paid-${idx}`} className="text-sm cursor-pointer">
													{row.paid ? (
														<Badge variant="default" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
															<Check className="h-3 w-3 mr-1" />
															Paid
														</Badge>
													) : (
														<Badge variant="outline" className="text-slate-600">Pending</Badge>
													)}
												</Label>
											</div>
										</div>

										<div className="space-y-2">
											<Label className="text-xs font-medium">Action</Label>
											<Button
												variant="outline"
												size="sm"
												onClick={() => deleteRow(idx)}
												className="w-full gap-2 text-destructive hover:text-destructive"
											>
												<Trash2 className="h-4 w-4" />
												Remove
											</Button>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				{rows.length > 0 && (
					<div className="pt-4 border-t">
						<div className="flex justify-between text-sm">
							<span className="font-medium">Total Scheduled:</span>
							<span className="font-bold">
								${rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0).toFixed(2)}
							</span>
						</div>
						<div className="flex justify-between text-sm mt-1">
							<span className="font-medium">Total Paid:</span>
							<span className="font-bold text-emerald-700">
								${actualCollected.toFixed(2)}
							</span>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
} 