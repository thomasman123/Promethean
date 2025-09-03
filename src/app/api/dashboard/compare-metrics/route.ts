import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { metricsEngine } from "@/lib/metrics/engine";
import type { MetricRequest } from "@/lib/metrics/types";

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value
          },
          set() {},
          remove() {},
        },
      }
    );
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const body = await req.json();
    const {
      accountId,
      filters,
      compareSettings
    } = body;
    
    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }
    
    // Convert date strings to Date objects
    if (filters.startDate) {
      filters.startDate = new Date(filters.startDate);
    }
    if (filters.endDate) {
      filters.endDate = new Date(filters.endDate);
    }
    
    // Check user has access to this account
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('account_id, role')
      .eq('id', user.id)
      .single();
      
    if (profileError || profileData.account_id !== accountId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    // Fetch metrics using the metrics engine
    // For now, return a simple response - this can be enhanced later for comparison features
    const metricRequest: MetricRequest = {
      metricName: body.metricName || 'total_appointments',
      filters: {
        dateRange: { start: filters.startDate, end: filters.endDate },
        accountId: accountId
      }
    };
    
    const metrics = await metricsEngine.execute(metricRequest);
    
    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching compare metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
} 