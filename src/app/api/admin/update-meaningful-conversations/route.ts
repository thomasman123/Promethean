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
    const { accountId, minDurationSeconds = 120 } = body as {
      accountId?: string;
      minDurationSeconds?: number;
    };

    console.log(`🔄 Updating meaningful conversations for account ${accountId || 'ALL'} with min duration ${minDurationSeconds}s`);

    // Update meaningful_conversation based on duration
    let query = supabase
      .from('dials')
      .update({ 
        meaningful_conversation: false // Will be overridden by the SQL
      })
      .not('duration', 'is', null);

    // Add account filter if specified
    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    // We need to use raw SQL for the conditional update
    const sqlQuery = accountId 
      ? `UPDATE dials SET meaningful_conversation = (duration >= ${minDurationSeconds}), updated_at = NOW() WHERE duration IS NOT NULL AND account_id = '${accountId}'`
      : `UPDATE dials SET meaningful_conversation = (duration >= ${minDurationSeconds}), updated_at = NOW() WHERE duration IS NOT NULL`;

    const { error } = await supabase.rpc('execute_metrics_query_array', {
      query_sql: sqlQuery,
      query_params: {}
    });

    if (error) {
      console.error('Error updating meaningful conversations:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get updated counts
    let countQuery = supabase
      .from('dials')
      .select('*', { count: 'exact', head: true })
      .eq('meaningful_conversation', true);

    if (accountId) {
      countQuery = countQuery.eq('account_id', accountId);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Error getting updated count:', countError);
    }

    console.log(`✅ Updated meaningful conversations. New count: ${count}`);

    return NextResponse.json({ 
      success: true, 
      meaningfulConversationsCount: count,
      minDurationSeconds,
      accountId: accountId || 'ALL',
      message: `Updated meaningful conversations based on ${minDurationSeconds}s minimum duration`
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 