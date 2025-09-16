import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database-temp.types";
import { syncAllContactsFromGHL } from "@/lib/contact-sync-strategy";

export async function POST(req: NextRequest) {
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => req.cookies.get(n)?.value, set() {}, remove() {} } }
  );

  try {
    const body = await req.json();
    const { accountId } = body as {
      accountId: string;
    };

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
    }

    console.log(`🔄 Starting full contact sync from GHL for account: ${accountId}`);

    // Get account with GHL credentials
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id, name, ghl_api_key, ghl_location_id')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (!account.ghl_api_key) {
      return NextResponse.json({ error: 'Account missing GHL API key' }, { status: 400 });
    }

    if (!account.ghl_location_id) {
      return NextResponse.json({ error: 'Account missing GHL location ID' }, { status: 400 });
    }

    // Run the full contact sync
    const syncedContacts = await syncAllContactsFromGHL(
      account.id, 
      account.ghl_api_key, 
      account.ghl_location_id
    );

    console.log(`✅ Full contact sync completed. Synced ${syncedContacts} contacts`);

    return NextResponse.json({ 
      success: true, 
      syncedContacts,
      accountId,
      accountName: account.name,
      message: `Successfully synced ${syncedContacts} contacts from GoHighLevel`
    });

  } catch (error) {
    console.error('❌ Full contact sync API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 