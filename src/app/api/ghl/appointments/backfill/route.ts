import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Reuse processors from webhook handler
import { } from '@/app/api/webhook/call-events/route'

export async function POST(request: NextRequest) {
	try {
		const body = await request.json()
		const { accountId, startIso, endIso } = body || {}
		if (!accountId || !startIso || !endIso) {
			return NextResponse.json({ error: 'accountId, startIso, endIso required' }, { status: 400 })
		}

		const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
		const { data: account } = await supabase
			.from('accounts')
			.select('*')
			.eq('id', accountId)
			.single()
		if (!account?.ghl_api_key) {
			return NextResponse.json({ error: 'GHL not connected' }, { status: 400 })
		}

		const headers: Record<string, string> = {
			Authorization: `Bearer ${account.ghl_api_key}`,
			Version: '2021-07-28',
			Accept: 'application/json',
		}
		if (account.ghl_location_id) headers['Location'] = account.ghl_location_id

		// Fetch calendars for mapping
		const { data: mappings } = await supabase
			.from('calendar_mappings')
			.select('*')
			.eq('account_id', accountId)

		let processed = 0
		let created = 0
		const errors: any[] = []

		// For each mapping, fetch appointments in range and feed through processAppointmentWebhook logic
		for (const mapping of mappings || []) {
			try {
				const url = new URL('https://services.leadconnectorhq.com/calendars/events/appointments')
				url.searchParams.set('calendarId', mapping.ghl_calendar_id)
				url.searchParams.set('startTime', startIso)
				url.searchParams.set('endTime', endIso)
				const resp = await fetch(url.toString(), { headers })
				if (!resp.ok) {
					errors.push({ calendar: mapping.ghl_calendar_id, status: resp.status })
					continue
				}
				const json = await resp.json()
				const list = json.appointments || json.data || []
				for (const appt of list) {
					processed++
					try {
						// Build a payload compatible with existing processor
						const payload = {
							type: 'AppointmentCreate',
							locationId: account.ghl_location_id,
							appointment: {
								id: appt.id,
								calendarId: mapping.ghl_calendar_id,
								title: appt.title,
								startTime: appt.startTime,
								contactId: appt.contactId,
								assignedUserId: appt.assignedUserId,
							},
						}
						// Inline import to avoid circular import issues
						const { default: mod } = await import('@/app/api/webhook/call-events/route') as any
						const fn = (mod as any).processAppointmentWebhook || (mod as any).default?.processAppointmentWebhook
						if (fn) {
							await fn(payload)
							created++
						}
					} catch (e) {
						errors.push({ id: appt?.id, error: (e as any)?.message || String(e) })
					}
				}
			} catch (e) {
				errors.push({ calendar: mapping.ghl_calendar_id, error: (e as any)?.message || String(e) })
			}
		}

		return NextResponse.json({ processed, created, errors })
	} catch (e) {
		return NextResponse.json({ error: 'Internal error' }, { status: 500 })
	}
} 