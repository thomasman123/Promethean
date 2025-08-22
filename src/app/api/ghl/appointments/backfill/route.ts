import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { processAppointmentWebhook } from '@/app/api/webhook/call-events/route'

export async function POST(request: NextRequest) {
	try {
		const body = await request.json()
		const { accountId, startIso, endIso } = body || {}
		if (!accountId || !startIso || !endIso) {
			return NextResponse.json({ error: 'accountId, startIso, endIso required' }, { status: 400 })
		}

		console.log('🔄 Starting backfill for account:', accountId, 'from', startIso, 'to', endIso)

		const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
		const { data: account } = await supabase
			.from('accounts')
			.select('*')
			.eq('id', accountId)
			.single()
		if (!account?.ghl_api_key) {
			return NextResponse.json({ error: 'GHL not connected' }, { status: 400 })
		}

		console.log('✅ Found account with GHL connection:', account.name)

		const headers: Record<string, string> = {
			Authorization: `Bearer ${account.ghl_api_key}`,
			Version: '2021-04-15',
			Accept: 'application/json',
		}

		// Convert ISO strings to milliseconds for GHL API
		const startMs = new Date(startIso).getTime()
		const endMs = new Date(endIso).getTime()

		console.log('🕐 Time conversion:', { startIso, endIso, startMs, endMs })

		// Fetch calendar mappings
		const { data: mappings } = await supabase
			.from('calendar_mappings')
			.select('*')
			.eq('account_id', accountId)

		let totalEvents = 0
		let processed = 0
		let created = 0
		const errors: any[] = []
		const calendarResults: Record<string, any> = {}

		if (!mappings || mappings.length === 0) {
			return NextResponse.json({ 
				error: 'No calendar mappings found for this account',
				processed: 0, 
				created: 0, 
				mappingCount: 0 
			})
		}

		console.log(`📅 Found ${mappings.length} calendar mappings`)

		// For each mapping, fetch events in range
		for (const mapping of mappings) {
			try {
				console.log(`🔍 Fetching events for calendar: ${mapping.ghl_calendar_id} -> ${mapping.target_table}`)
				
				const url = new URL('https://services.leadconnectorhq.com/calendars/events')
				url.searchParams.set('calendarId', mapping.ghl_calendar_id)
				url.searchParams.set('locationId', account.ghl_location_id)
				url.searchParams.set('startTime', startMs.toString())
				url.searchParams.set('endTime', endMs.toString())
				
				const eventsResp = await fetch(url.toString(), { headers })
				if (!eventsResp.ok) {
					const txt = await eventsResp.text().catch(() => '')
					console.error(`❌ Events fetch failed for ${mapping.ghl_calendar_id}:`, eventsResp.status, txt)
					errors.push({ calendar: mapping.ghl_calendar_id, status: eventsResp.status, body: txt?.slice(0, 500) })
					continue
				}

				const eventsJson = await eventsResp.json()
				const events = eventsJson.events || []
				totalEvents += events.length
				calendarResults[mapping.ghl_calendar_id] = { 
					events: events.length, 
					targetTable: mapping.target_table 
				}

				console.log(`📊 Found ${events.length} events for calendar ${mapping.ghl_calendar_id}`)

				// Process each event through EXACT webhook logic
				for (const event of events) {
					processed++
					try {
						console.log(`🔄 Processing event ${event.id} (${processed}/${totalEvents})`)

						// Build webhook-compatible payload exactly like live webhooks
						const payload = {
							type: 'AppointmentCreate',
							locationId: account.ghl_location_id,
							appointment: {
								id: event.id,
								calendarId: mapping.ghl_calendar_id,
								title: event.title,
								startTime: event.startTime,
								contactId: event.contactId,
								assignedUserId: event.assignedUserId,
							},
						}

						console.log(`📝 Processing through webhook pipeline: ${event.title} (${event.startTime})`)

						// Call EXACT same function as webhooks
						await processAppointmentWebhook(payload)
						created++

						console.log(`✅ Created/updated via webhook pipeline: ${event.id}`)

					} catch (e) {
						console.error(`❌ Error processing event ${event.id}:`, e)
						errors.push({ eventId: event.id, error: (e as any)?.message || String(e) })
					}
				}

			} catch (e) {
				console.error(`❌ Error processing calendar ${mapping.ghl_calendar_id}:`, e)
				errors.push({ calendar: mapping.ghl_calendar_id, error: (e as any)?.message || String(e) })
			}
		}

		console.log(`🎉 Backfill complete: ${totalEvents} events found, ${processed} processed, ${created} created`)

		return NextResponse.json({ 
			totalEvents,
			processed, 
			created, 
			mappingCount: mappings?.length || 0, 
			calendarResults, 
			errors 
		})
	} catch (e) {
		console.error('❌ Backfill error:', e)
		return NextResponse.json({ error: 'Internal error', details: (e as any)?.message }, { status: 500 })
	}
} 