import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ hasAccess: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get('account_id');

  if (!accountId) {
    return NextResponse.json({ hasAccess: false, error: 'Account ID is required' }, { status: 400 });
  }

  // Determine effective user id (impersonation if admin)
  const impersonatedCookie = cookieStore.get('impersonate_user_id')?.value || null;
  let effectiveUserId = user.id;
  
  if (impersonatedCookie) {
    const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (adminProfile?.role === 'admin') {
      effectiveUserId = impersonatedCookie;
    }
  }

  try {
    // Check if user is a global admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', effectiveUserId)
      .single();
    
    if (profile?.role === 'admin') {
      return NextResponse.json({ hasAccess: true });
    }

    // Check if user has moderator or admin role for the specific account
    const { data: access, error } = await supabase
      .from('account_access')
      .select('role')
      .eq('user_id', effectiveUserId)
      .eq('account_id', accountId)
      .in('role', ['admin', 'moderator'])
      .single();

    if (error || !access) {
      return NextResponse.json({ hasAccess: false });
    }

    return NextResponse.json({ hasAccess: true });

  } catch (error) {
    console.error('Error checking moderator access:', error);
    return NextResponse.json({ hasAccess: false, error: 'Internal server error' }, { status: 500 });
  }
}

