import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
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

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is moderator or admin
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('account_id') || '';
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  
  const isAdmin = profile?.role === 'admin';
  
  if (!isAdmin && accountId) {
    const { data: access } = await supabase
      .from('account_access')
      .select('role')
      .eq('user_id', user.id)
      .eq('account_id', accountId)
      .in('role', ['admin', 'moderator'])
      .single();
    
    if (!access) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
  }

  // Generate comprehensive test data
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const testItems = [
    // Discovery - Recent, not overdue
    {
      id: 'test-discovery-1',
      type: 'discovery' as const,
      account_id: accountId || 'test-account',
      account_name: 'Demo Account A',
      contact_name: 'John Smith',
      contact_email: 'john.smith@example.com',
      date_booked_for: oneHourAgo.toISOString(),
      setter: 'Demo Setter',
      sales_rep: 'Demo Closer',
      setter_user_id: user.id,
      sales_rep_user_id: 'test-sales-rep',
      call_outcome: null,
      show_outcome: null,
      lead_quality: null,
      data_filled: false,
    },
    // Discovery - Overdue (1 day)
    {
      id: 'test-discovery-2',
      type: 'discovery' as const,
      account_id: accountId || 'test-account',
      account_name: 'Demo Account B',
      contact_name: 'Sarah Johnson',
      contact_email: 'sarah.j@example.com',
      date_booked_for: yesterday.toISOString(),
      setter: 'Demo Setter',
      sales_rep: 'Demo Closer',
      setter_user_id: user.id,
      sales_rep_user_id: 'test-sales-rep',
      call_outcome: null,
      show_outcome: null,
      lead_quality: null,
      data_filled: false,
    },
    // Appointment - Recent, not overdue
    {
      id: 'test-appointment-1',
      type: 'appointment' as const,
      account_id: accountId || 'test-account',
      account_name: 'Demo Account C',
      contact_name: 'Michael Chen',
      contact_email: 'michael.chen@example.com',
      date_booked_for: oneHourAgo.toISOString(),
      setter: 'Demo Setter',
      sales_rep: 'Demo Closer',
      setter_user_id: 'test-setter',
      sales_rep_user_id: user.id,
      call_outcome: null,
      show_outcome: null,
      cash_collected: null,
      total_sales_value: null,
      pitched: null,
      watched_assets: null,
      lead_quality: null,
      objections: null,
      data_filled: false,
      follow_up_at: null,
    },
    // Appointment - Overdue (2 days)
    {
      id: 'test-appointment-2',
      type: 'appointment' as const,
      account_id: accountId || 'test-account',
      account_name: 'Demo Account D',
      contact_name: 'Emily Rodriguez',
      contact_email: 'emily.r@example.com',
      date_booked_for: twoDaysAgo.toISOString(),
      setter: 'Demo Setter',
      sales_rep: 'Demo Closer',
      setter_user_id: 'test-setter',
      sales_rep_user_id: user.id,
      call_outcome: null,
      show_outcome: null,
      cash_collected: null,
      total_sales_value: null,
      pitched: null,
      watched_assets: null,
      lead_quality: null,
      objections: null,
      data_filled: false,
      follow_up_at: null,
    },
    // Discovery - Overdue (3 days)
    {
      id: 'test-discovery-3',
      type: 'discovery' as const,
      account_id: accountId || 'test-account',
      account_name: 'Demo Account E',
      contact_name: 'David Kim',
      contact_email: 'david.kim@example.com',
      date_booked_for: threeDaysAgo.toISOString(),
      setter: 'Demo Setter',
      sales_rep: 'Demo Closer',
      setter_user_id: user.id,
      sales_rep_user_id: 'test-sales-rep',
      call_outcome: null,
      show_outcome: null,
      lead_quality: null,
      data_filled: false,
    },
    // Appointment - Won scenario
    {
      id: 'test-appointment-3',
      type: 'appointment' as const,
      account_id: accountId || 'test-account',
      account_name: 'Demo Account F',
      contact_name: 'Jennifer Taylor',
      contact_email: 'jen.taylor@example.com',
      date_booked_for: yesterday.toISOString(),
      setter: 'Demo Setter',
      sales_rep: 'Demo Closer',
      setter_user_id: 'test-setter',
      sales_rep_user_id: user.id,
      call_outcome: null,
      show_outcome: null,
      cash_collected: null,
      total_sales_value: null,
      pitched: null,
      watched_assets: null,
      lead_quality: null,
      objections: null,
      data_filled: false,
      follow_up_at: null,
    },
    // Appointment - No show scenario
    {
      id: 'test-appointment-4',
      type: 'appointment' as const,
      account_id: accountId || 'test-account',
      account_name: 'Demo Account G',
      contact_name: 'Robert Wilson',
      contact_email: 'rob.wilson@example.com',
      date_booked_for: yesterday.toISOString(),
      setter: 'Demo Setter',
      sales_rep: 'Demo Closer',
      setter_user_id: 'test-setter',
      sales_rep_user_id: user.id,
      call_outcome: null,
      show_outcome: null,
      cash_collected: null,
      total_sales_value: null,
      pitched: null,
      watched_assets: null,
      lead_quality: null,
      objections: null,
      data_filled: false,
      follow_up_at: null,
    },
  ];

  return NextResponse.json({
    items: testItems,
    appointments: testItems.filter(i => i.type === 'appointment').length,
    discoveries: testItems.filter(i => i.type === 'discovery').length,
    total: testItems.length,
    isTestData: true,
  });
}

