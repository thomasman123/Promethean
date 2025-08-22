import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

				// Process each event through the same logic as webhooks
				for (const event of events) {
					processed++
					try {
						console.log(`🔄 Processing event ${event.id} (${processed}/${totalEvents})`)

						// Fetch full appointment details
						const appointmentResp = await fetch(
							`https://services.leadconnectorhq.com/calendars/events/appointments/${event.id}`,
							{ headers }
						)

						if (!appointmentResp.ok) {
							const txt = await appointmentResp.text().catch(() => '')
							console.warn(`⚠️ Failed to fetch appointment details for ${event.id}:`, appointmentResp.status)
							errors.push({ eventId: event.id, error: `Failed to fetch details: ${appointmentResp.status}` })
							continue
						}

						const appointmentJson = await appointmentResp.json()
						const fullAppointment = appointmentJson.event || appointmentJson.appointment

						console.log(`📝 Processing appointment: ${fullAppointment.title} (${fullAppointment.startTime})`)

						// Process through inline webhook logic (copied from webhook route)
						await processAppointmentInline(supabase, account, mapping, fullAppointment)
						created++

						console.log(`✅ Created/updated appointment ${event.id}`)

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

// Inline appointment processing logic (copied and simplified from webhook route)
async function processAppointmentInline(supabase: any, account: any, mapping: any, fullAppointment: any) {
	// Get valid access token
	const accessToken = account.ghl_api_key

	// Fetch contact details
	let contactData = null
	if (fullAppointment.contactId && accessToken) {
		try {
			const contactResponse = await fetch(`https://services.leadconnectorhq.com/contacts/${fullAppointment.contactId}`, {
				headers: {
					'Authorization': `Bearer ${accessToken}`,
					'Version': '2021-04-15',
				},
			})
			if (contactResponse.ok) {
				const contactApiData = await contactResponse.json()
				contactData = contactApiData.contact
			}
		} catch (e) {
			console.warn('Failed to fetch contact:', e)
		}
	}

	// Fetch setter details (createdBy.userId)
	let setterData = null
	const setterId = fullAppointment?.createdBy?.userId
	if (setterId && accessToken) {
		try {
			const setterResponse = await fetch(`https://services.leadconnectorhq.com/users/${setterId}`, {
				headers: {
					'Authorization': `Bearer ${accessToken}`,
					'Version': '2021-04-15',
				},
			})
			if (setterResponse.ok) {
				setterData = await setterResponse.json()
			}
		} catch (e) {
			console.warn('Failed to fetch setter:', e)
		}
	}

	// Fetch sales rep details (assignedUserId)
	let salesRepData = null
	const salesRepId = fullAppointment?.assignedUserId
	if (salesRepId && accessToken) {
		try {
			const salesRepResponse = await fetch(`https://services.leadconnectorhq.com/users/${salesRepId}`, {
				headers: {
					'Authorization': `Bearer ${accessToken}`,
					'Version': '2021-04-15',
				},
			})
			if (salesRepResponse.ok) {
				salesRepData = await salesRepResponse.json()
			}
		} catch (e) {
			console.warn('Failed to fetch sales rep:', e)
		}
	}

	// Helper functions
	const getContactName = () => {
		if (contactData?.name) return contactData.name
		if (contactData?.firstName || contactData?.lastName) {
			return `${contactData.firstName || ''} ${contactData.lastName || ''}`.trim()
		}
		return fullAppointment?.title || 'Unknown Contact'
	}

	const getSetterName = () => {
		if (mapping.target_table === 'discoveries') {
			// For discoveries, setter is the appointment owner (sales rep)
			if (salesRepData?.name) return salesRepData.name
			if (salesRepData?.firstName || salesRepData?.lastName) {
				return `${salesRepData.firstName || ''} ${salesRepData.lastName || ''}`.trim()
			}
			return salesRepId ? `User ${salesRepId.slice(-8)}` : 'Webhook'
		}
		// For appointments, use the actual setter (createdBy)
		if (setterData?.name) return setterData.name
		if (setterData?.firstName || setterData?.lastName) {
			return `${setterData.firstName || ''} ${setterData.lastName || ''}`.trim()
		}
		return setterId ? `User ${setterId.slice(-8)}` : 'Webhook'
	}

	const getSalesRepName = () => {
		if (mapping.target_table === 'discoveries') {
			// For discoveries, sales rep is the setter (createdBy)
			if (setterData?.name) return setterData.name
			if (setterData?.firstName || setterData?.lastName) {
				return `${setterData.firstName || ''} ${setterData.lastName || ''}`.trim()
			}
			return setterId ? `User ${setterId.slice(-8)}` : 'Webhook'
		}
		// For appointments, use the assigned user
		if (salesRepData?.name) return salesRepData.name
		if (salesRepData?.firstName || salesRepData?.lastName) {
			return `${salesRepData.firstName || ''} ${salesRepData.lastName || ''}`.trim()
		}
		return null
	}

	// Auto-create users
	const { linkExistingUsersToData } = await import('@/lib/auto-user-creation')
	const userIds = await linkExistingUsersToData(
		supabase,
		account.id,
		getSetterName(),
		getSalesRepName(),
		mapping.target_table === 'discoveries' ? salesRepData?.email : setterData?.email,
		mapping.target_table === 'discoveries' ? setterData?.email : salesRepData?.email
	)

	// Upsert contact and get contact_id
	let contactId: string | null = null
	try {
		const contactUpsert = {
			account_id: account.id,
			ghl_contact_id: fullAppointment.contactId || null,
			name: getContactName(),
			email: contactData?.email || null,
			phone: contactData?.phone || null,
			source: contactData?.source || null,
			attribution_source: contactData?.attributionSource || null,
			last_attribution_source: contactData?.lastAttributionSource || null,
		}
		const { data: up } = await supabase
			.from('contacts')
			.upsert(contactUpsert, { onConflict: 'account_id,ghl_contact_id' })
			.select('id')
			.maybeSingle()
		contactId = up?.id || null
	} catch (e) {
		console.warn('Failed to upsert contact:', e)
	}

	// Build appointment/discovery data
	const baseData = {
		account_id: account.id,
		setter: getSetterName(),
		sales_rep: getSalesRepName(),
		call_outcome: null,
		show_outcome: null,
		lead_quality: null,
		date_booked_for: fullAppointment.startTime ? new Date(fullAppointment.startTime).toISOString() : null,
		setter_user_id: userIds.setterUserId || null,
		sales_rep_user_id: userIds.salesRepUserId || null,
		setter_ghl_id: mapping.target_table === 'discoveries' ? salesRepData?.id || null : setterData?.id || null,
		sales_rep_ghl_id: mapping.target_table === 'discoveries' ? setterData?.id || null : salesRepData?.id || null,
		ghl_appointment_id: fullAppointment.id || null,
		ghl_source: fullAppointment?.createdBy?.source || 'api_backfill',
		contact_id: contactId,
	}

	// Add table-specific fields
	const recordData = mapping.target_table === 'appointments' ? {
		...baseData,
		date_booked: new Date().toISOString(),
		cash_collected: null,
		total_sales_value: null,
		pitched: null,
		watched_assets: null,
		objections: null,
	} : baseData

	// Check for duplicates
	const ghlAppointmentId = fullAppointment.id
	if (ghlAppointmentId) {
		const { data: existing } = await supabase
			.from(mapping.target_table)
			.select('id')
			.eq('account_id', account.id)
			.eq('ghl_appointment_id', ghlAppointmentId)
			.maybeSingle()
		
		if (existing) {
			console.log(`📋 Duplicate ${mapping.target_table} detected, skipping:`, existing.id)
			return
		}
	}

	// Insert the record
	const { data: saved, error: saveError } = await supabase
		.from(mapping.target_table)
		.insert(recordData)
		.select()
		.single()

	if (saveError) {
		console.error(`Failed to save ${mapping.target_table}:`, saveError)
		throw new Error(`Failed to save ${mapping.target_table}: ${saveError.message}`)
	}

	console.log(`✅ ${mapping.target_table} saved successfully:`, saved.id)

	// Link discovery↔appointment if applicable
	if (mapping.target_table === 'appointments' && contactId) {
		try {
			const bookedAt = new Date((recordData as any).date_booked || new Date())
			const discWindowStart = new Date(bookedAt.getTime() - 60 * 60 * 1000)

			const { data: matchedDisc } = await supabase
				.from('discoveries')
				.select('id, linked_appointment_id')
				.eq('account_id', account.id)
				.eq('contact_id', contactId)
				.gte('date_booked_for', discWindowStart.toISOString())
				.lte('date_booked_for', bookedAt.toISOString())
				.is('linked_appointment_id', null)
				.order('date_booked_for', { ascending: false })
				.limit(1)
				.maybeSingle()

			if (matchedDisc) {
				await supabase.from('appointments').update({ linked_discovery_id: matchedDisc.id }).eq('id', saved.id)
				await supabase.from('discoveries').update({ linked_appointment_id: saved.id, show_outcome: 'booked' }).eq('id', matchedDisc.id)
				console.log('🔗 Linked discovery to appointment:', { discoveryId: matchedDisc.id, appointmentId: saved.id })
			}
		} catch (e) {
			console.warn('Failed to link discovery:', e)
		}
	}
} 