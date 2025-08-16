import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database-temp.types";

export async function POST(req: NextRequest) {
	const supabase = createServerClient<Database>(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: {
				get(name: string) {
					return req.cookies.get(name)?.value
				},
				set() {},
				remove() {},
			},
		}
	);

	const { data: { user }, error: authError } = await supabase.auth.getUser();
	if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	// Determine effective user id (impersonation if admin)
	const impersonatedCookie = req.cookies.get('impersonate_user_id')?.value || null;
	let effectiveUserId = user.id;
	if (impersonatedCookie) {
		const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
		if (adminProfile?.role === 'admin') {
			effectiveUserId = impersonatedCookie;
		}
	}

	const body = await req.json();
	const { appointmentId, payload } = body as {
		appointmentId: string,
		payload: {
			showOutcome: 'won' | 'lost',
			cashCollected?: number,
			totalSalesValue?: number,
			objections?: string[],
			leadQuality?: number,
			watchedAssets?: boolean,
			pitched?: boolean,
		}
	};

	if (!appointmentId || !payload?.showOutcome) {
		return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
	}

	// Authorization: only assigned sales_rep_user_id can update
	const { data: appt, error: fetchErr } = await supabase
		.from('appointments')
		.select('id, sales_rep_user_id')
		.eq('id', appointmentId)
		.single();
	if (fetchErr || !appt) {
		return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
	}
	if ((appt as any).sales_rep_user_id !== effectiveUserId) {
		return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
	}

	const { error: updError } = await supabase
		.from('appointments')
		.update({
			follow_up_show_outcome: payload.showOutcome,
			follow_up_cash_collected: payload.cashCollected ?? null,
			follow_up_total_sales_value: payload.totalSalesValue ?? null,
			follow_up_objections: payload.objections ?? null,
			follow_up_lead_quality: payload.leadQuality ?? null,
			follow_up_watched_assets: payload.watchedAssets ?? null,
			follow_up_pitched: payload.pitched ?? null,
			updated_at: new Date().toISOString(),
		})
		.eq('id', appointmentId);

	if (updError) {
		return NextResponse.json({ error: updError.message }, { status: 400 });
	}

	try {
		await (supabase as any).from('updates_audit').insert({
			user_id: effectiveUserId,
			entity_type: 'appointment_follow_up',
			entity_id: appointmentId,
			payload,
			created_at: new Date().toISOString(),
		});
	} catch {}

	return NextResponse.json({ ok: true });
} 