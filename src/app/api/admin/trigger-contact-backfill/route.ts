import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database-temp.types";

export async function POST(req: NextRequest) {
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => req.cookies.get(n)?.value, set() {}, remove() {} } }
  );

  try {
    const body = await req.json();
    const { accountId } = body as {
      accountId?: string;
    };

    console.log(`🔄 Triggering contact GHL dates backfill for account: ${accountId || 'ALL'}`);

    // Call the database function to backfill ghl_created_at
    const { data: result, error } = await supabase.rpc('backfill_contact_ghl_dates', {
      p_account_id: accountId || null
    });

    if (error) {
      console.error('❌ Error calling backfill function:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`✅ Backfill function completed. Processed ${result} contacts`);

    // Check the results
    let statusQuery = supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true });

    if (accountId) {
      statusQuery = statusQuery.eq('account_id', accountId);
    }

    const { count: totalContacts } = await statusQuery;

    let withGhlDateQuery = supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .not('ghl_created_at', 'is', null);

    if (accountId) {
      withGhlDateQuery = withGhlDateQuery.eq('account_id', accountId);
    }

    const { count: withGhlDate } = await withGhlDateQuery;

    let withLocalDateQuery = supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .not('ghl_local_date', 'is', null);

    if (accountId) {
      withLocalDateQuery = withLocalDateQuery.eq('account_id', accountId);
    }

    const { count: withLocalDate } = await withLocalDateQuery;

    return NextResponse.json({ 
      success: true, 
      processedContacts: result,
      totalContacts,
      withGhlCreatedAt: withGhlDate,
      withLocalDate,
      accountId: accountId || 'ALL',
      message: `Backfilled ${result} contacts. ${withGhlDate}/${totalContacts} now have GHL creation dates, ${withLocalDate}/${totalContacts} have local dates`
    });

  } catch (error) {
    console.error('❌ Backfill trigger API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 