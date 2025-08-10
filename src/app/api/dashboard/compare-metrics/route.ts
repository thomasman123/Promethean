import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { aggregateMetricsForDashboard } from "@/lib/dashboard/metrics-calculator";

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ 
      cookies: async () => await cookies() 
    });
    
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
    
    // Fetch metrics
    const metrics = await aggregateMetricsForDashboard(
      accountId,
      filters,
      compareSettings
    );
    
    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching compare metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
} 