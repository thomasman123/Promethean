import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role for admin operations
      {
        cookies: {
          get() { return undefined },
          set() {},
          remove() {},
        },
      }
    )

    const body = await request.json()
    const { accountId } = body

    if (!accountId) {
      return NextResponse.json({ error: 'accountId required' }, { status: 400 })
    }

    console.log('Fixing user roles for account:', accountId)

    // Get all users with their actual activity data
    const { data: userData, error } = await supabase
      .rpc('execute_metrics_query_array', {
        query_sql: `
          SELECT 
            aa.user_id,
            aa.account_id,
            aa.role as current_account_role,
            p.full_name,
            COUNT(CASE WHEN a.setter_user_id = aa.user_id THEN 1 END) as appointments_as_setter,
            COUNT(CASE WHEN a.sales_rep_user_id = aa.user_id THEN 1 END) as appointments_as_sales_rep,
            COUNT(CASE WHEN d.setter_user_id = aa.user_id THEN 1 END) as dials_as_setter,
            CASE 
              WHEN COUNT(CASE WHEN a.sales_rep_user_id = aa.user_id THEN 1 END) > COUNT(CASE WHEN a.setter_user_id = aa.user_id THEN 1 END) THEN 'sales_rep'
              WHEN aa.role IN ('admin', 'moderator') THEN aa.role
              ELSE 'setter'
            END as suggested_role
          FROM account_access aa
          JOIN profiles p ON p.id = aa.user_id
          LEFT JOIN appointments a ON (a.setter_user_id = aa.user_id OR a.sales_rep_user_id = aa.user_id) 
            AND a.account_id = aa.account_id
          LEFT JOIN dials d ON d.setter_user_id = aa.user_id 
            AND d.account_id = aa.account_id
          WHERE aa.account_id = $1
            AND aa.is_active = true
          GROUP BY aa.user_id, aa.account_id, aa.role, p.full_name
          ORDER BY p.full_name
        `,
        query_params: { 1: accountId }
      })

    if (error) {
      console.error('Error getting user data:', error)
      return NextResponse.json({ error: 'Failed to get user data' }, { status: 500 })
    }

    const users = Array.isArray(userData) ? userData : JSON.parse(String(userData))
    console.log('User activity data:', users)

    // Update roles that need fixing
    const updates = []
    for (const user of users) {
      if (user.current_account_role !== user.suggested_role) {
        console.log(`Updating ${user.full_name}: ${user.current_account_role} → ${user.suggested_role} (${user.appointments_as_sales_rep} sales rep appointments)`)
        
        const { error: updateError } = await supabase
          .from('account_access')
          .update({ 
            role: user.suggested_role,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.user_id)
          .eq('account_id', user.account_id)

        if (updateError) {
          console.error(`Error updating ${user.full_name}:`, updateError)
        } else {
          updates.push({
            user: user.full_name,
            from: user.current_account_role,
            to: user.suggested_role,
            reason: `${user.appointments_as_sales_rep} sales rep appointments`
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      accountId,
      totalUsers: users.length,
      updatedUsers: updates.length,
      updates
    })

  } catch (error) {
    console.error('Error in fix-user-roles API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 