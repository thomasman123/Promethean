import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

function mapCallOutcome(value: 'show' | 'no_show' | 'reschedule' | 'cancel'): string {
  switch (value) {
    case 'show': return 'Show'
    case 'no_show': return 'No Show'
    case 'reschedule': return 'Reschedule'
    case 'cancel': return 'Cancel'
  }
}

function mapShowOutcome(value: 'won' | 'lost' | 'follow_up'): string {
  switch (value) {
    case 'won': return 'won'
    case 'lost': return 'lost'
    case 'follow_up': return 'follow up'
  }
}

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

  const body = await req.json();
  const { appointmentId, payload } = body as {
    appointmentId: string,
    payload: {
      callOutcome: 'show' | 'no_show' | 'reschedule' | 'cancel',
      watchedAssets?: boolean,
      pitched?: boolean,
      shownOutcome?: 'won' | 'lost' | 'follow_up',
      cashCollected?: number,
      totalSalesValue?: number,
      objections?: string[],
      leadQuality: number
    }
  };

  if (!appointmentId || !payload?.callOutcome || !payload?.leadQuality) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const callOutcomeDb = mapCallOutcome(payload.callOutcome);
  const showOutcomeDb = payload.shownOutcome ? mapShowOutcome(payload.shownOutcome) : null;

  const { error: updError } = await supabase
    .from('appointments')
    .update({
      call_outcome: callOutcomeDb,
      watched_assets: payload.watchedAssets ?? null,
      pitched: payload.pitched ?? null,
      show_outcome: showOutcomeDb,
      cash_collected: payload.cashCollected ?? null,
      total_sales_value: payload.totalSalesValue ?? null,
      objections: payload.objections ?? null,
      lead_quality: payload.leadQuality,
      updated_at: new Date().toISOString(),
    })
    .eq('id', appointmentId);

  if (updError) {
    return NextResponse.json({ error: updError.message }, { status: 400 });
  }

  try {
    await (supabase as any).from('updates_audit').insert({
      user_id: user.id,
      entity_type: 'appointment',
      entity_id: appointmentId,
      payload,
      created_at: new Date().toISOString(),
    });
  } catch {}

  return NextResponse.json({ ok: true });
} 