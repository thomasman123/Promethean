import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            // Server-side: we don't set cookies in GET requests
          },
        },
      }
    )
    
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    
    if (!accountId) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 })
    }

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has access to this account
    const { data: accountAccess } = await supabase
      .from('account_access')
      .select('role')
      .eq('user_id', user.id)
      .eq('account_id', accountId)
      .eq('is_active', true)
      .single()

    if (!accountAccess || !['admin', 'moderator'].includes(accountAccess.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get account details for GHL API access
    const { data: account } = await supabase
      .from('accounts')
      .select('ghl_api_key, ghl_location_id')
      .eq('id', accountId)
      .single()

    if (!account?.ghl_api_key) {
      return NextResponse.json({ 
        pendingUsers: [],
        message: 'No GHL API access configured'
      })
    }

    // Get all unique GHL user IDs from appointments, discoveries, and dials
    const ghlUserIds = new Set<string>()
    
    // From appointments
    const { data: appointments } = await supabase
      .from('appointments')
      .select('setter_ghl_id, sales_rep_ghl_id, setter, sales_rep')
      .eq('account_id', accountId)
      .not('setter_ghl_id', 'is', null)
      .or('sales_rep_ghl_id.not.is.null')

    appointments?.forEach((app: any) => {
      if (app.setter_ghl_id) ghlUserIds.add(app.setter_ghl_id)
      if (app.sales_rep_ghl_id) ghlUserIds.add(app.sales_rep_ghl_id)
    })

    // From discoveries
    const { data: discoveries } = await supabase
      .from('discoveries')
      .select('setter_ghl_id, sales_rep_ghl_id, setter, sales_rep')
      .eq('account_id', accountId)
      .not('setter_ghl_id', 'is', null)
      .or('sales_rep_ghl_id.not.is.null')

    discoveries?.forEach((disc: any) => {
      if (disc.setter_ghl_id) ghlUserIds.add(disc.setter_ghl_id)
      if (disc.sales_rep_ghl_id) ghlUserIds.add(disc.sales_rep_ghl_id)
    })

    // From dials
    const { data: dials } = await supabase
      .from('dials')
      .select('setter_ghl_id, sales_rep_ghl_id, setter_name')
      .eq('account_id', accountId)
      .not('setter_ghl_id', 'is', null)
      .or('sales_rep_ghl_id.not.is.null')

    dials?.forEach((dial: any) => {
      if (dial.setter_ghl_id) ghlUserIds.add(dial.setter_ghl_id)
      if (dial.sales_rep_ghl_id) ghlUserIds.add(dial.sales_rep_ghl_id)
    })

    // Get existing app users by email to exclude them
    const { data: existingUsers } = await supabase
      .from('account_access')
      .select('profiles!inner(email)')
      .eq('account_id', accountId)
      .eq('is_active', true)

    const existingEmails = new Set(existingUsers?.map((u: any) => u.profiles.email) || [])

    // Fetch user details from GHL API for each unique ID
    const pendingUsers = []
    const headers = {
      'Authorization': `Bearer ${account.ghl_api_key}`,
      'Version': '2021-07-28',
      'Accept': 'application/json',
    }

    for (const ghlUserId of ghlUserIds) {
      try {
        const response = await fetch(`https://services.leadconnectorhq.com/users/${ghlUserId}`, { headers })
        if (response.ok) {
          const userData = await response.json()
          
          // Skip if user already exists in the app
          if (userData.email && existingEmails.has(userData.email)) {
            continue
          }

          // Count their activity
          const appointmentCount = appointments?.filter((a: any) => 
            a.setter_ghl_id === ghlUserId || a.sales_rep_ghl_id === ghlUserId
          ).length || 0

          const discoveryCount = discoveries?.filter((d: any) => 
            d.setter_ghl_id === ghlUserId || d.sales_rep_ghl_id === ghlUserId
          ).length || 0

          const dialCount = dials?.filter((d: any) => 
            d.setter_ghl_id === ghlUserId || d.sales_rep_ghl_id === ghlUserId
          ).length || 0

          const totalActivity = appointmentCount + discoveryCount + dialCount

          // Determine role based on activity
          let suggestedRole = 'setter'
          if (appointmentCount > 0 || discoveryCount > 0) {
            suggestedRole = 'sales_rep'
          }

          pendingUsers.push({
            ghl_user_id: ghlUserId,
            name: userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
            email: userData.email,
            first_name: userData.firstName,
            last_name: userData.lastName,
            phone: userData.phone,
            suggested_role: suggestedRole,
            activity_count: totalActivity,
            appointment_count: appointmentCount,
            discovery_count: discoveryCount,
            dial_count: dialCount,
            last_activity: new Date().toISOString(), // TODO: Calculate actual last activity
          })
        }
      } catch (error) {
        console.warn(`Failed to fetch GHL user ${ghlUserId}:`, error)
        continue
      }
    }

    // Sort by activity count descending
    pendingUsers.sort((a, b) => b.activity_count - a.activity_count)

    return NextResponse.json({ 
      pendingUsers,
      total: pendingUsers.length
    })

  } catch (error) {
    console.error('Error fetching pending users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending users' }, 
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            // Server-side: we don't set cookies in POST requests for this endpoint
          },
        },
      }
    )
    
    const { accountId, ghlUserId, email, fullName, role } = await request.json()
    
    if (!accountId || !ghlUserId) {
      return NextResponse.json({ error: 'Account ID and GHL User ID required' }, { status: 400 })
    }

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to invite
    const { data: accountAccess } = await supabase
      .from('account_access')
      .select('role')
      .eq('user_id', user.id)
      .eq('account_id', accountId)
      .eq('is_active', true)
      .single()

    if (!accountAccess || !['admin', 'moderator'].includes(accountAccess.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Create invitation via existing invite API
    const inviteResponse = await fetch(`${request.nextUrl.origin}/api/team/invite`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('Cookie') || ''
      },
      body: JSON.stringify({ 
        accountId, 
        email, 
        fullName, 
        role: role || 'setter'
      }),
    })

    if (!inviteResponse.ok) {
      const errorData = await inviteResponse.json()
      throw new Error(errorData.error || 'Failed to send invitation')
    }

    return NextResponse.json({ 
      success: true,
      message: 'User invited successfully'
    })

  } catch (error) {
    console.error('Error inviting pending user:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to invite user' }, 
      { status: 500 }
    )
  }
} 