import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 })
    }

    // Get the GHL connection for this account
    const { data: connection, error: connectionError } = await supabase
      .from('ghl_connections')
      .select('*')
      .eq('account_id', accountId)
      .eq('is_connected', true)
      .single()

    if (connectionError || !connection) {
      return NextResponse.json({ 
        error: 'No active GHL connection found for this account' 
      }, { status: 404 })
    }

    // Check if token is expired
    if (connection.token_expires_at && new Date(connection.token_expires_at) <= new Date()) {
      return NextResponse.json({ 
        error: 'GHL token expired. Please reconnect your GoHighLevel account.' 
      }, { status: 401 })
    }

    // Fetch calendars from GHL API
    const calendarsResponse = await fetch('https://services.leadconnectorhq.com/calendars/', {
      headers: {
        'Authorization': `Bearer ${connection.access_token}`,
        'Version': '2021-07-28',
      },
    })

    if (!calendarsResponse.ok) {
      const errorText = await calendarsResponse.text()
      console.error('GHL Calendars API error:', calendarsResponse.status, errorText)
      return NextResponse.json({ 
        error: `Failed to fetch calendars: ${calendarsResponse.status}` 
      }, { status: calendarsResponse.status })
    }

    const calendarsData = await calendarsResponse.json()
    
    return NextResponse.json({
      success: true,
      calendars: calendarsData.calendars || [],
    })

  } catch (error) {
    console.error('Error fetching GHL calendars:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
} 