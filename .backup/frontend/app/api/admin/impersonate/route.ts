import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

async function ensureAdmin(req: NextRequest, supabase: ReturnType<typeof createServerClient<Database>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return { ok: false };
  return { ok: true, userId: user.id };
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient<Database>(
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

  const adminCheck = await ensureAdmin(req, supabase);
  if (!adminCheck.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { userId } = await req.json() as { userId: string };
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  // Validate target exists
  const { data: target, error } = await supabase.from('profiles').select('id,email,full_name').eq('id', userId).single();
  if (error || !target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set('impersonate_user_id', userId, { httpOnly: true, sameSite: 'lax', path: '/' });
  return res;
}

export async function DELETE(req: NextRequest) {
  const supabase = createServerClient<Database>(
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

  const adminCheck = await ensureAdmin(req, supabase);
  if (!adminCheck.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set('impersonate_user_id', '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
  return res;
} 