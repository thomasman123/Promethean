import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase service client for webhook operations
const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface DialWebhookPayload {
  type: string
  dial: {
    contactName: string
    phone: string
    email?: string
    setter?: string
    duration?: number
    answered?: boolean
    meaningful_conversation?: boolean
    call_recording_link?: string
    date_called?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload: DialWebhookPayload = await request.json()

    // Accept either a specific event or generic payload
    const dial = payload.dial || (payload as any)

    const insert = {
      contact_name: dial.contactName,
      phone: dial.phone,
      email: dial.email || null,
      setter: dial.setter || 'Webhook',
      duration: typeof dial.duration === 'number' ? dial.duration : 0,
      answered: Boolean(dial.answered) || false,
      meaningful_conversation: Boolean(dial.meaningful_conversation) || false,
      call_recording_link: dial.call_recording_link || null,
      date_called: dial.date_called || new Date().toISOString(),
    }

    const { error } = await supabaseService.from('dials').insert(insert)

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to save dial' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Dial saved' })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const challenge = searchParams.get('challenge')
  if (challenge) return new Response(challenge)
  return NextResponse.json({ message: 'Dials Webhook Endpoint' })
} 