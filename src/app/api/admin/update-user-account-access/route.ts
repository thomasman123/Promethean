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
    const { userId, changes } = body as {
      userId: string;
      changes: Array<{
        accountId: string;
        hasAccess: boolean;
        role: string;
      }>;
    };

    if (!userId || !changes) {
      return NextResponse.json({ error: 'userId and changes are required' }, { status: 400 });
    }

    console.log(`🔄 Updating account access for user: ${userId}`);
    console.log(`📝 Processing ${changes.length} changes:`, changes);

    let addedCount = 0;
    let removedCount = 0;
    let updatedCount = 0;

    for (const change of changes) {
      const { accountId, hasAccess, role } = change;
      console.log(`🔄 Processing change for account ${accountId}: hasAccess=${hasAccess}, role=${role}`);

      if (hasAccess) {
        // Grant or update access
        const { data: existingAccess, error: queryError } = await supabase
          .from('account_access')
          .select('id, role')
          .eq('user_id', userId)
          .eq('account_id', accountId)
          .single();

        console.log(`🔍 Existing access check for ${accountId}:`, { existingAccess, queryError });

        if (existingAccess) {
          // Update existing access
          console.log(`🔄 User already has access, checking if role needs update: ${existingAccess.role} -> ${role}`);
          if (existingAccess.role !== role) {
            const { error } = await supabase
              .from('account_access')
              .update({ 
                role: role as any,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', userId)
              .eq('account_id', accountId);

            if (error) {
              console.error('❌ Error updating access:', error);
            } else {
              console.log(`✅ Updated role for user ${userId} on account ${accountId}: ${role}`);
              updatedCount++;
            }
          } else {
            console.log(`ℹ️ Role unchanged for user ${userId} on account ${accountId}: ${role}`);
          }
        } else {
          // Grant new access
          console.log(`🆕 Granting new access for user ${userId} on account ${accountId}: ${role}`);
          const { error } = await supabase
            .from('account_access')
            .insert({
              user_id: userId,
              account_id: accountId,
              role: role as any,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (error) {
            console.error('❌ Error granting access:', error);
            console.error('❌ Insert error details:', error);
          } else {
            console.log(`✅ Granted access for user ${userId} on account ${accountId}: ${role}`);
            addedCount++;
          }
        }
      } else {
        // Remove access
        const { error } = await supabase
          .from('account_access')
          .delete()
          .eq('user_id', userId)
          .eq('account_id', accountId);

        if (error) {
          console.error('❌ Error removing access:', error);
        } else {
          console.log(`✅ Removed access for user ${userId} from account ${accountId}`);
          removedCount++;
        }
      }
    }

    console.log(`✅ Account access update complete: ${addedCount} added, ${updatedCount} updated, ${removedCount} removed`);

    return NextResponse.json({ 
      success: true,
      userId,
      summary: {
        added: addedCount,
        updated: updatedCount,
        removed: removedCount
      },
      message: `Updated account access: ${addedCount} added, ${updatedCount} updated, ${removedCount} removed`
    });

  } catch (error) {
    console.error('❌ Update user account access API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 