import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database-temp.types";
import { backfillContactGHLDates } from "@/lib/contact-sync-strategy";

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

    console.log(`🔄 Starting GHL contact dates backfill for account: ${accountId || 'ALL'}`);

    let totalProcessed = 0;
    let accountsProcessed = 0;

    if (accountId) {
      // Backfill for specific account
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select('id, name, ghl_api_key')
        .eq('id', accountId)
        .single();

      if (accountError || !account) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }

      if (!account.ghl_api_key) {
        return NextResponse.json({ error: 'Account missing GHL API key' }, { status: 400 });
      }

      const processed = await backfillContactGHLDates(account.id, account.ghl_api_key);
      totalProcessed = processed;
      accountsProcessed = 1;

    } else {
      // Backfill for all accounts with GHL API keys
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('id, name, ghl_api_key')
        .not('ghl_api_key', 'is', null);

      if (accountsError) {
        return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
      }

      if (!accounts || accounts.length === 0) {
        return NextResponse.json({ error: 'No accounts with GHL API keys found' }, { status: 404 });
      }

      console.log(`🔄 Processing ${accounts.length} accounts for contact backfill`);

      for (const account of accounts) {
        try {
          console.log(`📞 Backfilling contacts for account: ${account.name} (${account.id})`);
          const processed = await backfillContactGHLDates(account.id, account.ghl_api_key!);
          totalProcessed += processed;
          accountsProcessed++;
          
          // Wait between accounts to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error(`❌ Error processing account ${account.name}:`, error);
        }
      }
    }

    console.log(`✅ Backfill complete. Processed ${totalProcessed} contacts across ${accountsProcessed} accounts`);

    return NextResponse.json({ 
      success: true, 
      totalProcessed,
      accountsProcessed,
      message: `Backfilled GHL creation dates for ${totalProcessed} contacts across ${accountsProcessed} accounts`
    });

  } catch (error) {
    console.error('❌ Backfill API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 