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
    const { accountId, startDate, endDate } = body as {
      accountId: string;
      startDate: string;
      endDate: string;
    };

    if (!accountId || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Get account timezone
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('business_timezone')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const timezone = account.business_timezone || 'UTC';

    // Call the bulk calculation function
    const { data: result, error } = await supabase.rpc('bulk_calculate_work_timeframes', {
      p_account_id: accountId,
      p_start_date: startDate,
      p_end_date: endDate,
      p_timezone: timezone
    });

    if (error) {
      console.error('Error populating work timeframes:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      processedCount: result,
      timezone,
      message: `Populated work timeframes for ${result} user-date combinations`
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 