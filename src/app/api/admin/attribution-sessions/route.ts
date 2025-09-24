import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"

async function ensureAdmin(req: NextRequest, supabase: ReturnType<typeof createServerClient<Database>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return { ok: false };
  return { ok: true, userId: user.id };
}

export async function GET(req: NextRequest) {
  // Auth with anon client (to read cookies), then use service client to bypass RLS for admin-only access
  const anon = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => req.cookies.get(name)?.value,
        set() {},
        remove() {},
      },
    }
  );

  const adminCheck = await ensureAdmin(req, anon);
  if (!adminCheck.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 200);
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();

  const service = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch recent sessions (limit), optionally basic text search across common fields
  let { data: sessions, error } = await service
    .from('attribution_sessions')
    .select(`
      id,
      session_id,
      landing_url,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      fbclid,
      fbp,
      fbc,
      meta_campaign_id,
      meta_ad_set_id,
      meta_ad_id,
      attribution_quality,
      attribution_method,
      user_agent,
      ip_address,
      first_visit_at,
      last_activity_at,
      created_at,
      updated_at,
      contact_id
    `)
    .order('last_activity_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }

  sessions = sessions || [];

  // If q provided, do a simple in-memory filter on a few string fields
  let filtered = sessions;
  if (q) {
    filtered = sessions.filter(s => {
      const fields = [
        s.session_id,
        s.utm_source || '',
        s.utm_medium || '',
        s.utm_campaign || '',
        s.utm_content || '',
        s.utm_term || '',
        s.fbclid || '',
        s.meta_campaign_id || '',
        s.meta_ad_set_id || '',
        s.meta_ad_id || '',
        s.landing_url || ''
      ].join(' ').toLowerCase();
      return fields.includes(q);
    });
  }

  // Attach contact (email, account_id) map for quick UI needs
  const contactIds = Array.from(new Set(filtered.map(s => s.contact_id).filter(Boolean))) as string[];
  let contactsById: Record<string, { id: string, email: string | null, account_id: string | null }> = {};
  if (contactIds.length > 0) {
    const { data: contacts } = await service
      .from('contacts')
      .select('id,email,account_id')
      .in('id', contactIds);
    (contacts || []).forEach(c => { contactsById[c.id] = { id: c.id, email: c.email || null, account_id: c.account_id || null }; });
  }

  const result = filtered.map(s => ({
    ...s,
    contact: s.contact_id ? (contactsById[s.contact_id] || null) : null
  }));

  return NextResponse.json({ sessions: result });
} 