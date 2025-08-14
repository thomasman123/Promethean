import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

function mapCallOutcome(value: 'show' | 'no_show' | 'reschedule' | 'cancel'): string {
  switch (value) {
    case 'show': return 'show'
    case 'no_show': return 'no show'
    case 'reschedule': return 'reschedule'
    case 'cancel': return 'cancel'
  }
}

function mapShowOutcome(value: 'booked' | 'not_booked'): string {
  switch (value) {
    case 'booked': return 'booked'
    case 'not_booked': return 'not booked'
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
  const { discoveryId, payload } = body as {
    discoveryId: string,
    payload: {
      callOutcome: 'show' | 'no_show' | 'reschedule' | 'cancel',
      shownOutcome?: 'booked' | 'not_booked',
      leadQuality?: number
    }
  };

  if (!discoveryId || !payload?.callOutcome) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Authorization: only assigned setter_user_id can update
  const { data: discovery, error: fetchErr } = await supabase
    .from('discoveries')
    .select('id, setter_user_id')
    .eq('id', discoveryId)
    .single();
  if (fetchErr || !discovery) {
    return NextResponse.json({ error: 'Discovery not found' }, { status: 404 });
  }
  if (discovery.setter_user_id !== effectiveUserId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const callOutcomeDb = mapCallOutcome(payload.callOutcome);
  const showOutcomeDb = payload.shownOutcome ? mapShowOutcome(payload.shownOutcome) : null;

  const { error: updError } = await supabase
    .from('discoveries')
    .update({
      call_outcome: callOutcomeDb,
      show_outcome: showOutcomeDb,
      lead_quality: payload.leadQuality ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', discoveryId);

  if (updError) {
    return NextResponse.json({ error: updError.message }, { status: 400 });
  }

  try {
    await (supabase as any).from('updates_audit').insert({
      user_id: effectiveUserId,
      entity_type: 'discovery',
      entity_id: discoveryId,
      payload,
      created_at: new Date().toISOString(),
    });
  } catch {}

  return NextResponse.json({ ok: true });
} 