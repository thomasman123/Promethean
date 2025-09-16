import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database-temp.types";

// GET ?appointmentId=... -> list payments
export async function GET(req: NextRequest) {
	const supabase = createServerClient<Database>(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{ cookies: { get: (n: string) => req.cookies.get(n)?.value, set() {}, remove() {} } }
	);
	const { searchParams } = new URL(req.url);
	const appointmentId = searchParams.get('appointmentId');
	if (!appointmentId) return NextResponse.json({ error: 'Missing appointmentId' }, { status: 400 });
	const { data, error } = await supabase.from('appointment_payments').select('*').eq('appointment_id', appointmentId).order('payment_date', { ascending: true });
	if (error) return NextResponse.json({ error: error.message }, { status: 400 });
	return NextResponse.json({ payments: data });
}

// POST -> create payment or init default row
export async function POST(req: NextRequest) {
	const supabase = createServerClient<Database>(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{ cookies: { get: (n: string) => req.cookies.get(n)?.value, set() {}, remove() {} } }
	);
	const body = await req.json();
	const { action, appointmentId, payment } = body as {
		action?: 'init' | 'create',
		appointmentId: string,
		payment?: { payment_date: string; amount: number; paid?: boolean }
	};
	if (!appointmentId) return NextResponse.json({ error: 'Missing appointmentId' }, { status: 400 });

	if (action === 'init') {
		// Check if payments already exist to prevent duplicates
		const { data: existingPayments, error: checkError } = await supabase
			.from('appointment_payments')
			.select('id')
			.eq('appointment_id', appointmentId)
			.limit(1);
		
		if (checkError) return NextResponse.json({ error: checkError.message }, { status: 400 });
		
		// If payments already exist, don't create another one
		if (existingPayments && existingPayments.length > 0) {
			return NextResponse.json({ ok: true, message: 'Payments already exist' });
		}

		// Insert default row with today's date and amount equal to current cash_collected (if set)
		const { data: appt, error: aerr } = await supabase.from('appointments').select('id, cash_collected').eq('id', appointmentId).single();
		if (aerr || !appt) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
		const initialAmount = (appt as any).cash_collected || 0;
		
		// Only create if there's actually cash collected
		if (initialAmount > 0) {
			const todayIso = new Date().toISOString();
			const { error: ierr } = await supabase.from('appointment_payments').insert({ 
				appointment_id: appointmentId, 
				payment_date: todayIso, 
				amount: initialAmount, 
				paid: true 
			});
			if (ierr) return NextResponse.json({ error: ierr.message }, { status: 400 });
		}
		
		return NextResponse.json({ ok: true });
	}

	if (action === 'create') {
		if (!payment) return NextResponse.json({ error: 'Missing payment' }, { status: 400 });
		const { error: cerr } = await supabase.from('appointment_payments').insert({ appointment_id: appointmentId, payment_date: payment.payment_date, amount: payment.amount, paid: !!payment.paid });
		if (cerr) return NextResponse.json({ error: cerr.message }, { status: 400 });
		return NextResponse.json({ ok: true });
	}

	return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

// PATCH -> update a payment
export async function PATCH(req: NextRequest) {
	const supabase = createServerClient<Database>(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{ cookies: { get: (n: string) => req.cookies.get(n)?.value, set() {}, remove() {} } }
	);
	const body = await req.json();
	const { id, changes } = body as { id: string; changes: Partial<{ payment_date: string; amount: number; paid: boolean }>} ;
	if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
	const { error } = await supabase.from('appointment_payments').update(changes as any).eq('id', id);
	if (error) return NextResponse.json({ error: error.message }, { status: 400 });
	return NextResponse.json({ ok: true });
}

// DELETE -> delete a payment by id
export async function DELETE(req: NextRequest) {
	const supabase = createServerClient<Database>(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{ cookies: { get: (n: string) => req.cookies.get(n)?.value, set() {}, remove() {} } }
	);
	const { searchParams } = new URL(req.url);
	const id = searchParams.get('id');
	if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
	const { error } = await supabase.from('appointment_payments').delete().eq('id', id);
	if (error) return NextResponse.json({ error: error.message }, { status: 400 });
	return NextResponse.json({ ok: true });
} 