"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useAccountTimezone } from "@/hooks/use-account-timezone";
import { useDashboard } from "@/lib/dashboard-context";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

// Create a cache to track initialization status per appointment
const initializationCache = new Map<string, boolean>();

export function PaymentPlan({ appointmentId, totalSalesValue, cashCollected, onPaymentUpdate }: PaymentPlanProps) {
	const [rows, setRows] = useState<PaymentRow[]>([]);
	const [loading, setLoading] = useState<boolean>(false);
	const [saving, setSaving] = useState<string | null>(null);

	const { selectedAccountId } = useDashboard();
	const { formatDate } = useAccountTimezone(selectedAccountId);
	const { toast } = useToast();

	// Check if this appointment has been initialized before
	const isInitialized = initializationCache.get(appointmentId) || false;

	// Calculate collected amount from paid payments
	const collected = useMemo(() => {
		return rows.filter(r => r.paid).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
	}, [rows]);

	// If no payments exist yet, use the cashCollected from the appointment
	// Otherwise use the actual payments data
	const actualCollected = rows.length === 0 ? cashCollected : collected;
	const remaining = Math.max(0, Number(totalSalesValue || 0) - Number(actualCollected || 0));
	const isComplete = remaining === 0 && totalSalesValue > 0;

	// Calculate total scheduled to check if we can add more payments
	const totalScheduled = rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
	const canAddMorePayments = totalScheduled < totalSalesValue;

	// Load existing payments
	const fetchPayments = useCallback(async () => {
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
				// Mark as initialized if payments exist or if we've already tried to initialize
				if (mapped.length > 0 || isInitialized) {
					initializationCache.set(appointmentId, true);
				}
			} else {
				setRows([]);
			}
		} catch (error) {
			console.error('Failed to fetch payments:', error);
			setRows([]);
		} finally {
			setLoading(false);
		}
	}, [appointmentId, isInitialized]);

	useEffect(() => {
		fetchPayments();
	}, [fetchPayments]);

	// Initialize with cash collected amount if no payments exist
	const ensureInitialized = useCallback(async () => {
		// Don't initialize if already initialized OR if payments already exist
		if (isInitialized || rows.length > 0) {
			return;
		}
		
		// If there's cash collected and no payments exist, automatically add it as the first payment (marked as paid)
		if (cashCollected > 0) {
			try {
				const res = await fetch('/api/appointments/payments', { 
					method: 'POST', 
					headers: { 'Content-Type': 'application/json' }, 
					body: JSON.stringify({ action: 'init', appointmentId }) 
				});
				if (res.ok) {
					// Mark as initialized to prevent re-initialization
					initializationCache.set(appointmentId, true);
					// Refresh the data
					await fetchPayments();
					// Only call onPaymentUpdate if it exists, don't show toast here
					onPaymentUpdate?.();
				} else {
					const errorData = await res.json();
					console.error('❌ [PaymentPlan] Init API call failed:', errorData);
				}
			} catch (error) {
				console.error('Failed to initialize payments:', error);
			}
		} else {
			initializationCache.set(appointmentId, true);
		}
	}, [appointmentId, isInitialized, rows.length, cashCollected, fetchPayments, onPaymentUpdate]);

	useEffect(() => {
		// Only try to initialize after we've loaded existing payments and not already initialized
		if (!loading && !isInitialized && rows.length === 0 && cashCollected > 0) {
			ensureInitialized();
		}
	}, [loading, isInitialized, rows.length, cashCollected, ensureInitialized]);

	const addRow = () => {
		if (!canAddMorePayments) {
			toast({
				title: "Cannot Add Payment",
				description: `Total scheduled payments would exceed total sales value.`,
				variant: "destructive"
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
					await fetchPayments();
					onPaymentUpdate?.();
				}
			} catch (error) {
				console.error('Failed to create payment:', error);
				toast({
					title: "Error",
					description: "Failed to create payment. Please try again.",
					variant: "destructive"
				});
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
				toast({
					title: "Error",
					description: "Failed to update payment. Please try again.",
					variant: "destructive"
				});
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
					toast({
						title: "Payment Deleted",
						description: "Payment has been removed from the schedule.",
					});
				}
			} catch (error) {
				console.error('Failed to delete payment:', error);
				toast({
					title: "Error",
					description: "Failed to delete payment. Please try again.",
					variant: "destructive"
				});
			}
		}
	};

	if (loading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Payment Plan</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="animate-pulse space-y-4">
						<div className="h-4 bg-muted rounded w-1/4"></div>
						<div className="h-4 bg-muted rounded w-1/2"></div>
						<div className="h-4 bg-muted rounded w-3/4"></div>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Payment Plan</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Summary */}
				<div className="grid grid-cols-3 gap-4">
					<div>
						<p className="text-sm text-muted-foreground">Total Value</p>
						<p className="text-2xl font-semibold">${totalSalesValue.toFixed(2)}</p>
					</div>
					<div>
						<p className="text-sm text-muted-foreground">Collected</p>
						<p className="text-2xl font-semibold">${actualCollected.toFixed(2)}</p>
					</div>
					<div>
						<p className="text-sm text-muted-foreground">Remaining</p>
						<p className={cn(
							"text-2xl font-semibold",
							remaining > 0 ? "text-destructive" : "text-green-600"
						)}>
							${remaining.toFixed(2)}
						</p>
					</div>
				</div>

				{isComplete && (
					<Badge variant="default" className="w-fit">
						Payment Plan Complete
					</Badge>
				)}

				{remaining > 0 && (
					<Alert>
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>
							${remaining.toFixed(2)} remaining to be collected.
						</AlertDescription>
					</Alert>
				)}

				<Separator />

				{/* Payment Schedule */}
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<h3 className="text-lg font-semibold">Payment Schedule</h3>
						<Button 
							onClick={addRow} 
							disabled={!canAddMorePayments}
							size="sm"
						>
							<Plus className="h-4 w-4 mr-2" />
							Add Payment
						</Button>
					</div>

					{rows.length === 0 ? (
						<div className="text-center py-8 text-muted-foreground">
							<p>No payments scheduled</p>
							<p className="text-sm mt-2">Click "Add Payment" to create a payment schedule</p>
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Due Date</TableHead>
									<TableHead>Amount</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="w-[100px]">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{rows.map((row, idx) => (
									<TableRow key={row.id || idx}>
										<TableCell>
											<DateTimePicker
												value={row.payment_date}
												onChange={(date) => date && updateRow(idx, { payment_date: date })}
												placeholder="Select date"
											/>
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-2">
												<span className="text-muted-foreground">$</span>
												<Input
													type="number"
													step="0.01"
													value={row.amount}
													onChange={(e) => updateRow(idx, { amount: e.target.value })}
													className="w-32"
													placeholder="0.00"
													disabled={saving === row.id || saving === `new-${idx}`}
												/>
											</div>
										</TableCell>
										<TableCell>
											<div className="flex items-center space-x-2">
												<Checkbox
													id={`paid-${idx}`}
													checked={row.paid}
													onCheckedChange={(checked) => updateRow(idx, { paid: !!checked })}
													disabled={saving === row.id || saving === `new-${idx}`}
												/>
												<Label htmlFor={`paid-${idx}`} className="cursor-pointer">
													{row.paid ? (
														<Badge variant="default">Paid</Badge>
													) : (
														<Badge variant="outline">Pending</Badge>
													)}
												</Label>
											</div>
										</TableCell>
										<TableCell>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => deleteRow(idx)}
												disabled={saving === row.id || saving === `new-${idx}`}
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</div>

				{/* Footer Summary */}
				{rows.length > 0 && (
					<div className="pt-4 border-t space-y-2">
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Total Scheduled</span>
							<span className="font-medium">${totalScheduled.toFixed(2)}</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Total Paid</span>
							<span className="font-medium">${actualCollected.toFixed(2)}</span>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
} 