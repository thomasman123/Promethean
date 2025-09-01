import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export async function GET(request: NextRequest) {
	try {
		const url = new URL(request.url)
		const accountId = url.searchParams.get('accountId')
		const contactId = url.searchParams.get('contactId')
		if (!accountId || !contactId) return NextResponse.json({ error: 'accountId and contactId required' }, { status: 400 })

		const supabase = createServerClient<Database>(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
			{
				cookies: {
					get(name: string) { return request.cookies.get(name)?.value },
					set() {},
					remove() {},
				},
			}
		)

		// Auth
		const { data: { session } } = await supabase.auth.getSession()
		if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

		// Load contact
		const { data: contact } = await supabase.from('contacts').select('*').eq('account_id', accountId).eq('id', contactId).single()
		if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })

		// Timeline queries
		const [dialsRes, discsRes, apptsRes] = await Promise.all([
			supabase.from('dials').select('id, date_called, setter, setter_user_id').eq('account_id', accountId).eq('contact_id', contactId).order('date_called', { ascending: true }),
			supabase.from('discoveries').select('id, date_booked_for, setter, setter_user_id, linked_appointment_id').eq('account_id', accountId).eq('contact_id', contactId).order('date_booked_for', { ascending: true }),
			supabase.from('appointments').select('id, date_booked, date_booked_for, setter, sales_rep, setter_user_id, sales_rep_user_id, call_outcome, show_outcome, cash_collected, total_sales_value').eq('account_id', accountId).eq('contact_id', contactId).order('date_booked', { ascending: true }),
		])

		const timeline: Array<{ type: string; at: string; data: any }> = []
		for (const row of (dialsRes.data || [])) timeline.push({ type: 'dial', at: row.date_called as string, data: row })
		for (const row of (discsRes.data || [])) timeline.push({ type: 'discovery', at: row.date_booked_for as string, data: row })
		for (const row of (apptsRes.data || [])) timeline.push({ type: 'appointment', at: row.date_booked as string, data: row })
		timeline.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())

		return NextResponse.json({ contact, timeline })
	} catch (e: any) {
		console.error('Journey error:', e)
		return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
	}
} 