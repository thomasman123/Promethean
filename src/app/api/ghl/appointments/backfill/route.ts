import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { processAppointmentWebhook } from '@/app/api/webhook/call-events/route'

interface AppointmentLog {
	eventId: string
	title: string
	startTime: string
	contactId: string | null
	assignedUserId: string | null
	steps: {
		fetchEvent: { status: 'success' | 'failed', message?: string }
		mapCalendar: { status: 'success' | 'failed', message?: string, targetTable?: string }
		fetchContact: { status: 'success' | 'failed', message?: string, contactEmail?: string }
		linkSetter: { status: 'success' | 'failed', message?: string, setterName?: string }
		linkSalesRep: { status: 'success' | 'failed', message?: string, salesRepName?: string }
		createRecord: { status: 'success' | 'failed', message?: string, recordId?: string }
	}
	finalStatus: 'success' | 'failed'
	errorMessage?: string
}

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
		const appointmentLogs: AppointmentLog[] = []

		if (!mappings || mappings.length === 0) {
			return NextResponse.json({ 
				error: 'No calendar mappings found for this account',
				processed: 0, 
				created: 0, 
				mappingCount: 0,
				appointmentLogs: []
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
					
					// Initialize log for this appointment
					const log: AppointmentLog = {
						eventId: event.id,
						title: event.title || 'Untitled',
						startTime: event.startTime || 'Unknown',
						contactId: event.contactId || null,
						assignedUserId: event.assignedUserId || null,
						steps: {
							fetchEvent: { status: 'success' },
							mapCalendar: { status: 'success', targetTable: mapping.target_table, message: `Mapped to ${mapping.target_table}` },
							fetchContact: { status: 'failed', message: 'Not attempted' },
							linkSetter: { status: 'failed', message: 'Not attempted' },
							linkSalesRep: { status: 'failed', message: 'Not attempted' },
							createRecord: { status: 'failed', message: 'Not attempted' }
						},
						finalStatus: 'failed'
					}

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

						// Attempt to track individual steps by wrapping the webhook call
						// We'll mark steps as success if the overall call succeeds
						// For more granular tracking, we'd need to modify processAppointmentWebhook to return step details
						
						try {
							await processAppointmentWebhook(payload)
							
							// If we got here, all steps succeeded
							log.steps.fetchContact.status = 'success'
							log.steps.fetchContact.message = `Contact ${event.contactId || 'N/A'}`
							
							log.steps.linkSetter.status = 'success'
							log.steps.linkSetter.message = 'Setter linked'
							
							log.steps.linkSalesRep.status = 'success'
							log.steps.linkSalesRep.message = event.assignedUserId ? `Sales rep ${event.assignedUserId}` : 'No sales rep'
							
							log.steps.createRecord.status = 'success'
							log.steps.createRecord.message = `Record created/updated in ${mapping.target_table}`
							
							log.finalStatus = 'success'
							created++
							
							console.log(`✅ Created/updated via webhook pipeline: ${event.id}`)

						} catch (webhookError: any) {
							// Determine which step failed based on error message
							const errMsg = webhookError?.message || String(webhookError)
							
							if (errMsg.includes('contact') || errMsg.includes('Contact')) {
								log.steps.fetchContact.status = 'failed'
								log.steps.fetchContact.message = errMsg.slice(0, 100)
							} else if (errMsg.includes('setter') || errMsg.includes('Setter')) {
								log.steps.fetchContact.status = 'success'
								log.steps.linkSetter.status = 'failed'
								log.steps.linkSetter.message = errMsg.slice(0, 100)
							} else if (errMsg.includes('sales rep') || errMsg.includes('assigned')) {
								log.steps.fetchContact.status = 'success'
								log.steps.linkSetter.status = 'success'
								log.steps.linkSalesRep.status = 'failed'
								log.steps.linkSalesRep.message = errMsg.slice(0, 100)
							} else if (errMsg.includes('upsert') || errMsg.includes('insert')) {
								log.steps.fetchContact.status = 'success'
								log.steps.linkSetter.status = 'success'
								log.steps.linkSalesRep.status = 'success'
								log.steps.createRecord.status = 'failed'
								log.steps.createRecord.message = errMsg.slice(0, 100)
							} else {
								// Generic error
								log.steps.createRecord.status = 'failed'
								log.steps.createRecord.message = errMsg.slice(0, 100)
							}
							
							log.errorMessage = errMsg
							log.finalStatus = 'failed'
							
							throw webhookError
						}

					} catch (e) {
						const errMsg = (e as any)?.message || String(e)
						console.error(`❌ Error processing event ${event.id}:`, errMsg)
						errors.push({ eventId: event.id, error: errMsg })
						
						if (!log.errorMessage) {
							log.errorMessage = errMsg
						}
					}
					
					appointmentLogs.push(log)
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
			errors,
			appointmentLogs
		})
	} catch (e) {
		console.error('❌ Backfill error:', e)
		return NextResponse.json({ error: 'Internal error', details: (e as any)?.message }, { status: 500 })
	}
} 