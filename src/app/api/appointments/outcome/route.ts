import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

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
      objection?: string,
      leadQuality: number
    }
  };

  if (!appointmentId || !payload?.callOutcome || !payload?.leadQuality) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { error: updError } = await supabase
    .from('appointments')
    .update({
      call_outcome: payload.callOutcome,
      watched_assets: payload.watchedAssets ?? null,
      pitched: payload.pitched ?? null,
      shown_outcome: payload.shownOutcome ?? null,
      cash_collected: payload.cashCollected ?? null,
      total_sales_value: payload.totalSalesValue ?? null,
      objection: payload.objection ?? null,
      lead_quality: payload.leadQuality,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', appointmentId);

  if (updError) {
    return NextResponse.json({ error: updError.message }, { status: 400 });
  }

  // Audit log (cast to any until types include updates_audit)
  await (supabase as any).from('updates_audit').insert({
    user_id: user.id,
    entity_type: 'appointment',
    entity_id: appointmentId,
    payload,
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
} 