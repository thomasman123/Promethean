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
      accountId: string;
    };

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
    }

    console.log(`🔄 Fixing contact local dates for account: ${accountId}`);

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

    // Get all contacts for this account
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('id, created_at')
      .eq('account_id', accountId);

    if (contactsError) {
      return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
    }

    if (!contacts || contacts.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No contacts found for this account',
        processed: 0
      });
    }

    let processed = 0;
    const batchSize = 50;

    // Process contacts in batches
    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);
      
      const updates = batch.map(contact => {
        const createdAt = new Date(contact.created_at);
        const localDate = new Date(createdAt.toLocaleString('en-CA', { timeZone: timezone }));
        
        return {
          id: contact.id,
          ghl_created_at: contact.created_at, // Use created_at as fallback for ghl_created_at
          ghl_local_date: localDate.toISOString().split('T')[0], // YYYY-MM-DD format
          ghl_local_week: getWeekStart(localDate).toISOString().split('T')[0],
          ghl_local_month: new Date(localDate.getFullYear(), localDate.getMonth(), 1).toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        };
      });

      // Update batch
      const { error: updateError } = await supabase
        .from('contacts')
        .upsert(updates, { onConflict: 'id' });

      if (updateError) {
        console.error('❌ Error updating batch:', updateError);
      } else {
        processed += batch.length;
        console.log(`✅ Processed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(contacts.length/batchSize)} - ${processed}/${contacts.length} contacts`);
      }
    }

    return NextResponse.json({ 
      success: true, 
      processed,
      totalContacts: contacts.length,
      timezone,
      message: `Fixed local dates for ${processed}/${contacts.length} contacts using timezone ${timezone}`
    });

  } catch (error) {
    console.error('❌ Fix contact local dates API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to get the start of the week (Monday)
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
} 