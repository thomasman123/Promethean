import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/lib/database-temp.types';

export async function GET(req: NextRequest) {
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId');
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    let query = supabase
      .from('follow_up_dashboard')
      .select('*')
      .eq('account_id', accountId)
      .order('scheduled_for', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    if (userId) {
      query = query.eq('assigned_to_user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching follow-ups:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/follow-ups:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json();
    const { 
      appointment_id,
      account_id,
      scheduled_for,
      assigned_to_user_id,
      assigned_to_name,
      assigned_to_ghl_id,
      notes
    } = body;

    if (!appointment_id || !account_id || !scheduled_for) {
      return NextResponse.json({ 
        error: 'appointment_id, account_id, and scheduled_for are required' 
      }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('follow_ups')
      .insert({
        appointment_id,
        account_id,
        scheduled_for,
        assigned_to_user_id,
        assigned_to_name,
        assigned_to_ghl_id,
        notes,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating follow-up:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create notification for the assigned user
    if (assigned_to_user_id) {
      const { error: notifError } = await supabase
        .from('follow_up_notifications')
        .insert({
          follow_up_id: data.id,
          user_id: assigned_to_user_id,
          account_id,
          notification_type: 'reminder',
          scheduled_for,
          title: 'Follow-up Reminder',
          message: `You have a follow-up scheduled`,
          action_url: `/follow-ups`
        });

      if (notifError) {
        console.error('Error creating notification:', notifError);
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in POST /api/follow-ups:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Follow-up ID is required' }, { status: 400 });
    }

    // If completing the follow-up, set completed_at
    if (updateData.status === 'completed' && !updateData.completed_at) {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('follow_ups')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating follow-up:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PATCH /api/follow-ups:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Follow-up ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('follow_ups')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting follow-up:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/follow-ups:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 