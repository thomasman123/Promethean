import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

export async function GET(req: NextRequest) {
	const supabase = createServerClient<Database>(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{ cookies: { get: (n: string) => req.cookies.get(n)?.value, set() {}, remove() {} } }
	);

	try {
		// Get payment plans with appointment and contact details
		const { data: paymentPlans, error } = await supabase
			.from('appointment_payments')
			.select(`
				*,
				appointments!inner (
					id,
					account_id,
					setter,
					sales_rep,
					setter_user_id,
					sales_rep_user_id,
					call_outcome,
					show_outcome,
					cash_collected,
					total_sales_value,
					lead_quality,
					date_booked_for,
					date_booked,
					contact_id,
					contacts (
						id,
						name,
						email,
						phone
					),
					accounts (
						id,
						name
					)
				)
			`)
			.order('payment_date', { ascending: true });

		if (error) {
			console.error('Error fetching payment plans:', error);
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		// Group payments by appointment and calculate totals
		const appointmentPayments = paymentPlans?.reduce((acc, payment) => {
			const appointmentId = payment.appointments.id;
			if (!acc[appointmentId]) {
				acc[appointmentId] = {
					appointment: payment.appointments,
					payments: [],
					totalScheduled: 0,
					totalPaid: 0,
					remainingBalance: 0,
					nextPaymentDue: null,
					overduePayments: 0
				};
			}

			acc[appointmentId].payments.push(payment);
			acc[appointmentId].totalScheduled += Number(payment.amount || 0);
			if (payment.paid) {
				acc[appointmentId].totalPaid += Number(payment.amount || 0);
			}

			// Find next payment due
			const paymentDate = new Date(payment.payment_date);
			const now = new Date();
			if (!payment.paid) {
				if (!acc[appointmentId].nextPaymentDue || paymentDate < new Date(acc[appointmentId].nextPaymentDue)) {
					acc[appointmentId].nextPaymentDue = payment.payment_date;
				}
				// Count overdue payments
				if (paymentDate < now) {
					acc[appointmentId].overduePayments += 1;
				}
			}

			return acc;
		}, {} as any) || {};

		// Calculate remaining balance for each appointment
		Object.keys(appointmentPayments).forEach(appointmentId => {
			const plan = appointmentPayments[appointmentId];
			const totalSalesValue = Number(plan.appointment.total_sales_value || 0);
			plan.remainingBalance = totalSalesValue - plan.totalPaid;
		});

		// Convert to array and sort by next payment due
		const paymentPlansArray = Object.values(appointmentPayments).sort((a: any, b: any) => {
			if (!a.nextPaymentDue && !b.nextPaymentDue) return 0;
			if (!a.nextPaymentDue) return 1;
			if (!b.nextPaymentDue) return -1;
			return new Date(a.nextPaymentDue).getTime() - new Date(b.nextPaymentDue).getTime();
		});

		// Calculate summary statistics
		const summary = {
			totalPlans: paymentPlansArray.length,
			totalScheduled: paymentPlansArray.reduce((sum, plan: any) => sum + plan.totalScheduled, 0),
			totalPaid: paymentPlansArray.reduce((sum, plan: any) => sum + plan.totalPaid, 0),
			totalRemaining: paymentPlansArray.reduce((sum, plan: any) => sum + plan.remainingBalance, 0),
			overdueCount: paymentPlansArray.filter((plan: any) => plan.overduePayments > 0).length,
			completedCount: paymentPlansArray.filter((plan: any) => plan.remainingBalance <= 0).length
		};

		return NextResponse.json({ 
			paymentPlans: paymentPlansArray,
			summary 
		});

	} catch (error) {
		console.error('Error in payment plans API:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
} 