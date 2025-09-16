"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Calendar, DollarSign, Plus, Trash2, Check, CreditCard, Clock, TrendingUp } from "lucide-react";
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
	const isComplete = remaining === 0;

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
				description: `Total scheduled payments (${totalScheduled.toFixed(2)}) would exceed total sales value.`,
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
			<Card className="w-full">
				<CardHeader className="pb-4">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-blue-100 rounded-lg">
							<CreditCard className="h-5 w-5 text-blue-600" />
						</div>
						<div>
							<CardTitle className="text-lg">Payment Plan</CardTitle>
							<CardDescription>Loading payment schedule...</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="animate-pulse space-y-4">
						<div className="grid grid-cols-3 gap-4">
							<div className="h-16 bg-gray-200 rounded-lg"></div>
							<div className="h-16 bg-gray-200 rounded-lg"></div>
							<div className="h-16 bg-gray-200 rounded-lg"></div>
						</div>
						<div className="h-32 bg-gray-200 rounded-lg"></div>
					</div>
				</CardContent>
			</Card>
		);
	}

	const progressPercentage = totalSalesValue > 0 ? (actualCollected / totalSalesValue) * 100 : 0;

	return (
		<Card className="w-full">
			<CardHeader className="pb-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-blue-100 rounded-lg">
							<CreditCard className="h-5 w-5 text-blue-600" />
						</div>
						<div>
							<CardTitle className="text-lg flex items-center gap-2">
								Payment Plan
								{isComplete && (
									<Badge className="bg-green-100 text-green-700 hover:bg-green-100">
										<Check className="h-3 w-3 mr-1" />
										Complete
									</Badge>
								)}
							</CardTitle>
							<CardDescription>Track payment schedule and collection progress</CardDescription>
						</div>
					</div>
					<div className="text-right">
						<div className="text-2xl font-bold text-gray-900">
							{progressPercentage.toFixed(0)}%
						</div>
						<div className="text-sm text-gray-500">Collected</div>
					</div>
				</div>

				{/* Progress Bar */}
				<div className="mt-4">
					<div className="flex justify-between text-sm text-gray-600 mb-2">
						<span>Collection Progress</span>
						<span>${actualCollected.toFixed(2)} of ${totalSalesValue.toFixed(2)}</span>
					</div>
					<div className="w-full bg-gray-200 rounded-full h-3">
						<div 
							className={cn(
								"h-3 rounded-full transition-all duration-500",
								isComplete ? "bg-green-500" : "bg-blue-500"
							)}
							style={{ width: `${Math.min(progressPercentage, 100)}%` }}
						/>
					</div>
				</div>
			</CardHeader>

			<CardContent className="space-y-6">
				{/* Summary Stats */}
				<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
					<div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-blue-100 rounded-lg">
								<TrendingUp className="h-4 w-4 text-blue-600" />
							</div>
							<div>
								<div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Total Value</div>
								<div className="text-xl font-bold text-gray-900">${totalSalesValue.toFixed(2)}</div>
							</div>
						</div>
					</div>

					<div className="bg-green-50 rounded-xl p-4 border border-green-200">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-green-100 rounded-lg">
								<Check className="h-4 w-4 text-green-600" />
							</div>
							<div>
								<div className="text-xs font-medium text-green-700 uppercase tracking-wide">Collected</div>
								<div className="text-xl font-bold text-green-800">${actualCollected.toFixed(2)}</div>
							</div>
						</div>
					</div>

					<div className={cn(
						"rounded-xl p-4 border",
						remaining > 0 
							? "bg-amber-50 border-amber-200" 
							: "bg-green-50 border-green-200"
					)}>
						<div className="flex items-center gap-3">
							<div className={cn(
								"p-2 rounded-lg",
								remaining > 0 ? "bg-amber-100" : "bg-green-100"
							)}>
								<Clock className={cn(
									"h-4 w-4",
									remaining > 0 ? "text-amber-600" : "text-green-600"
								)} />
							</div>
							<div>
								<div className={cn(
									"text-xs font-medium uppercase tracking-wide",
									remaining > 0 ? "text-amber-700" : "text-green-700"
								)}>
									Remaining
								</div>
								<div className={cn(
									"text-xl font-bold",
									remaining > 0 ? "text-amber-800" : "text-green-800"
								)}>
									${remaining.toFixed(2)}
								</div>
							</div>
						</div>
					</div>

					<div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-purple-100 rounded-lg">
								<Calendar className="h-4 w-4 text-purple-600" />
							</div>
							<div>
								<div className="text-xs font-medium text-purple-700 uppercase tracking-wide">Payments</div>
								<div className="text-xl font-bold text-purple-800">{rows.length}</div>
							</div>
						</div>
					</div>
				</div>

				{remaining > 0 && (
					<Alert className="border-amber-200 bg-amber-50">
						<AlertCircle className="h-4 w-4 text-amber-600" />
						<AlertDescription className="text-amber-800">
							<strong>${remaining.toFixed(2)} remaining to collect.</strong> Add payment installments below to complete the plan.
						</AlertDescription>
					</Alert>
				)}

				<Separator />

				{/* Payment Schedule Section */}
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<h3 className="text-lg font-semibold flex items-center gap-2">
							<Calendar className="h-5 w-5 text-gray-600" />
							Payment Schedule
						</h3>
						<Button 
							onClick={addRow} 
							disabled={!canAddMorePayments}
							className="gap-2 bg-blue-600 hover:bg-blue-700"
						>
							<Plus className="h-4 w-4" />
							Add Payment
						</Button>
					</div>

					{!canAddMorePayments && totalScheduled >= totalSalesValue && (
						<Alert className="border-red-200 bg-red-50">
							<AlertCircle className="h-4 w-4 text-red-600" />
							<AlertDescription className="text-red-800">
								Cannot add more payments. Total scheduled (${totalScheduled.toFixed(2)}) equals or exceeds total sales value.
							</AlertDescription>
						</Alert>
					)}

					{rows.length === 0 ? (
						<div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
							<div className="p-3 bg-gray-200 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
								<Calendar className="h-8 w-8 text-gray-400" />
							</div>
							<h4 className="text-lg font-medium text-gray-900 mb-2">No payments scheduled</h4>
							<p className="text-gray-600 mb-4">Create your first payment installment to get started</p>
							<Button onClick={addRow} className="gap-2">
								<Plus className="h-4 w-4" />
								Add First Payment
							</Button>
						</div>
					) : (
						<div className="space-y-3">
							{rows.map((row, idx) => (
								<div key={row.id || idx} className={cn(
									"rounded-xl border-2 p-5 transition-all duration-200",
									row.paid 
										? "bg-green-50 border-green-200 shadow-sm" 
										: "bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm",
									saving === row.id || saving === `new-${idx}` ? "opacity-50 pointer-events-none" : ""
								)}>
									<div className="grid grid-cols-1 lg:grid-cols-6 gap-6 items-end">
										{/* Due Date */}
										<div className="lg:col-span-2 space-y-2">
											<Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
												<Calendar className="h-4 w-4" />
												Due Date
											</Label>
											<DateTimePicker
												value={row.payment_date}
												onChange={(date) => date && updateRow(idx, { payment_date: date })}
												placeholder="Select date"
												className="w-full"
											/>
										</div>
										
										{/* Amount */}
										<div className="space-y-2">
											<Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
												<DollarSign className="h-4 w-4" />
												Amount
											</Label>
											<div className="relative">
												<span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
												<Input
													type="number"
													step="0.01"
													value={row.amount}
													onChange={(e) => updateRow(idx, { amount: e.target.value })}
													className="pl-8 text-lg font-semibold"
													placeholder="0.00"
												/>
											</div>
										</div>

										{/* Status */}
										<div className="space-y-2">
											<Label className="text-sm font-semibold text-gray-700">Status</Label>
											<div className="flex items-center space-x-3">
												<Checkbox
													id={`paid-${idx}`}
													checked={row.paid}
													onCheckedChange={(checked) => updateRow(idx, { paid: !!checked })}
													className="h-5 w-5"
												/>
												<Label htmlFor={`paid-${idx}`} className="cursor-pointer">
													{row.paid ? (
														<Badge className="bg-green-100 text-green-800 hover:bg-green-100 px-3 py-1">
															<Check className="h-3 w-3 mr-1" />
															Paid
														</Badge>
													) : (
														<Badge variant="outline" className="px-3 py-1 border-gray-300">
															<Clock className="h-3 w-3 mr-1" />
															Pending
														</Badge>
													)}
												</Label>
											</div>
										</div>

										{/* Payment Info */}
										<div className="space-y-2">
											<Label className="text-sm font-semibold text-gray-700">Info</Label>
											<div className="text-sm text-gray-600">
												{row.paid ? (
													<span className="text-green-700 font-medium">✓ Collected</span>
												) : (
													<span>Due {formatDate(row.payment_date)}</span>
												)}
											</div>
										</div>

										{/* Actions */}
										<div className="space-y-2">
											<Label className="text-sm font-semibold text-gray-700">Actions</Label>
											<Button
												variant="outline"
												size="sm"
												onClick={() => deleteRow(idx)}
												className="w-full gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
											>
												<Trash2 className="h-4 w-4" />
												Remove
											</Button>
										</div>
									</div>

									{saving === row.id || saving === `new-${idx}` ? (
										<div className="mt-3 text-sm text-blue-600 flex items-center gap-2">
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
											Saving changes...
										</div>
									) : null}
								</div>
							))}
						</div>
					)}
				</div>

				{/* Summary Footer */}
				{rows.length > 0 && (
					<div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
							<div>
								<div className="text-sm text-gray-600">Total Scheduled</div>
								<div className="text-lg font-bold text-gray-900">
									${totalScheduled.toFixed(2)}
								</div>
							</div>
							<div>
								<div className="text-sm text-gray-600">Total Paid</div>
								<div className="text-lg font-bold text-green-700">
									${actualCollected.toFixed(2)}
								</div>
							</div>
							<div>
								<div className="text-sm text-gray-600">Remaining</div>
								<div className={cn(
									"text-lg font-bold",
									remaining > 0 ? "text-amber-700" : "text-green-700"
								)}>
									${remaining.toFixed(2)}
								</div>
							</div>
							<div>
								<div className="text-sm text-gray-600">Progress</div>
								<div className="text-lg font-bold text-blue-700">
									{progressPercentage.toFixed(0)}%
								</div>
							</div>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
} 