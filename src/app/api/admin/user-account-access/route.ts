import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database-temp.types";

export async function GET(req: NextRequest) {
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => req.cookies.get(n)?.value, set() {}, remove() {} } }
  );

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    console.log(`📊 Loading account access for user: ${userId}`);

    // Get all accounts
    const { data: allAccounts, error: accountsError } = await supabase
      .from('accounts')
      .select('id, name')
      .order('name');

    if (accountsError) {
      console.error('❌ Error fetching accounts:', accountsError);
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
    }

    // Get user's current account access
    const { data: userAccess, error: accessError } = await supabase
      .from('account_access')
      .select('account_id, role, created_at')
      .eq('user_id', userId);

    if (accessError) {
      console.error('❌ Error fetching user access:', accessError);
      return NextResponse.json({ error: 'Failed to fetch user access' }, { status: 500 });
    }

    // Create access map
    const accessMap = new Map(userAccess?.map(access => [access.account_id, access]) || []);

    // Combine data
    const accounts = allAccounts?.map(account => {
      const access = accessMap.get(account.id);
      return {
        accountId: account.id,
        accountName: account.name,
        role: access?.role || 'setter',
        hasAccess: !!access,
        grantedAt: access?.created_at
      };
    }) || [];

    console.log(`✅ Loaded access for ${accounts.length} accounts, user has access to ${accounts.filter(a => a.hasAccess).length}`);

    return NextResponse.json({ 
      success: true,
      accounts,
      userId
    });

  } catch (error) {
    console.error('❌ User account access API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 