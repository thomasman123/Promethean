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
    const { data: identity, error: identityError } = await supabase.auth.getUser();
    if (identityError || !identity.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const { accountId, minDurationSeconds = 120 } = await req.json();
    if (accountId != null && (typeof accountId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(accountId))) {
      return NextResponse.json({ error: "Invalid account ID" }, { status: 400 });
    }
    if (!Number.isInteger(minDurationSeconds) || minDurationSeconds < 0 || minDurationSeconds > 2147483647) {
      return NextResponse.json({ error: "Invalid minimum duration" }, { status: 400 });
    }
    // Typed SQL parameters; the database checks actual administrator identity.
    // Never expose the service-only arbitrary-SQL metrics functions here.
    const { data: count, error } = await supabase.rpc("update_meaningful_conversations", {
      p_account_id: accountId ?? null,
      p_min_duration_seconds: minDurationSeconds,
    });
    if (error) {
      return NextResponse.json(
        { error: error.code === "42501" ? "Administrator access required" : "Update failed" },
        { status: error.code === "42501" ? 403 : 500 }
      );
    }
    return NextResponse.json({
      success: true,
      meaningfulConversationsCount: count,
      minDurationSeconds,
      accountId: accountId ?? "ALL",
      message: `Updated meaningful conversations based on ${minDurationSeconds}s minimum duration`,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
