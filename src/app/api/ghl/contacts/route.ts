import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

async function getValidGhlAccessToken(account: any, supabase: any): Promise<string | null> {
	try {
		const authType = account.ghl_auth_type || 'oauth2'
		const currentAccessToken = account.ghl_api_key as string | null
		const refreshToken = account.ghl_refresh_token as string | null
		const expiresAtIso = account.ghl_token_expires_at as string | null

		if (authType !== 'oauth2') return currentAccessToken || null

		const clientId = process.env.GHL_CLIENT_ID
		const clientSecret = process.env.GHL_CLIENT_SECRET
		if (!clientId || !clientSecret) return currentAccessToken || null

		const now = Date.now()
		const expiresAtMs = expiresAtIso ? new Date(expiresAtIso).getTime() : 0
		const skewMs = 2 * 60 * 1000
		const needsRefresh = !currentAccessToken || !expiresAtMs || now >= (expiresAtMs - skewMs)
		if (!needsRefresh) return currentAccessToken as string

		if (!refreshToken) return currentAccessToken || null

		const resp = await fetch('https://services.leadconnectorhq.com/oauth/token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				client_id: clientId,
				client_secret: clientSecret,
				grant_type: 'refresh_token',
				refresh_token: refreshToken,
			}),
		})
		if (!resp.ok) return currentAccessToken || null

		const tokenData = await resp.json()
		const newAccessToken = tokenData.access_token as string
		const newRefreshToken = (tokenData.refresh_token as string) || refreshToken
		const newExpiresAtIso = new Date(Date.now() + (tokenData.expires_in as number) * 1000).toISOString()

		await supabase
			.from('accounts')
			.update({
				ghl_api_key: newAccessToken,
				ghl_refresh_token: newRefreshToken,
				ghl_token_expires_at: newExpiresAtIso,
				ghl_auth_type: 'oauth2',
			})
			.eq('id', account.id)

		return newAccessToken
	} catch (e) {
		return account?.ghl_api_key || null
	}
}

export async function POST(request: NextRequest) {
	try {
		const supabase = createServerClient<Database>(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
			{
				cookies: {
					get(name: string) {
						return request.cookies.get(name)?.value
					},
					set() {},
					remove() {},
				},
			}
		)

		const body = await request.json().catch(() => ({}))
		const accountId: string | undefined = body.accountId
		const since: string | undefined = body.since // ISO string optional for incremental
		const limit: number = Math.min(5000, Math.max(1, Number(body.limit) || 1000))
		const dryRun: boolean = Boolean(body.dryRun)

		if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 })

		// Auth check
		const { data: { user } } = await supabase.auth.getUser()
		if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

		// require admin or moderator on this account
		const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
		const isGlobalAdmin = profile?.role === 'admin'
		if (!isGlobalAdmin) {
			const { data: access } = await supabase
				.from('account_access')
				.select('role')
				.eq('user_id', user.id)
				.eq('account_id', accountId)
				.eq('is_active', true)
				.single()
			if (!access || !['moderator'].includes(access.role)) {
				return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
			}
		}

		// Load account
		const { data: account } = await supabase
			.from('accounts')
			.select('id, name, ghl_location_id, ghl_api_key, ghl_refresh_token, ghl_token_expires_at, ghl_auth_type')
			.eq('id', accountId)
			.single()
		if (!account) return NextResponse.json({ error: 'Account not found or not connected to GHL' }, { status: 404 })

		const accessToken = await getValidGhlAccessToken(account, supabase)
		if (!accessToken) return NextResponse.json({ error: 'No valid GHL access token available' }, { status: 400 })

		const headers: Record<string, string> = {
			Authorization: `Bearer ${accessToken}`,
			Version: '2021-07-28',
			Accept: 'application/json',
		}
		if (account.ghl_location_id) headers['Location'] = account.ghl_location_id

		// Pagination through contacts
		let totalFetched = 0
		let insertedOrUpdated = 0
		let page = 1
		let hasMore = true
		const pageLimit = Math.min(200, Math.max(10, Math.floor(limit / 5))) // chunk requests

		const mapContact = (c: any) => {
			const firstName = c.firstName || null
			const lastName = c.lastName || null
			const name = c.name || [firstName, lastName].filter(Boolean).join(' ') || null
			return {
				account_id: accountId,
				ghl_contact_id: c.id,
				first_name: firstName,
				last_name: lastName,
				name,
				email: c.email || null,
				phone: c.phone || null,
				source: c.source || null,
				timezone: c.timezone || null,
				assigned_to: c.assignedTo || null,
				date_added: c.dateAdded ? new Date(c.dateAdded).toISOString() : null,
				date_updated: c.dateUpdated ? new Date(c.dateUpdated).toISOString() : null,
				tags: Array.isArray(c.tags) ? c.tags : [],
				attribution_source: c.attributionSource || null,
				last_attribution_source: c.lastAttributionSource || null,
				custom_fields: c.customFields || c.customField || null,
			}
		}

		const upsertBatch = async (batch: any[]) => {
			if (dryRun || batch.length === 0) return { count: 0 }
			const { error } = await supabase
				.from('contacts')
				.upsert(batch, { onConflict: 'account_id,ghl_contact_id' })
			if (error) throw new Error(error.message)
			insertedOrUpdated += batch.length
			return { count: batch.length }
		}

		while (hasMore && totalFetched < limit) {
			const url = new URL('https://services.leadconnectorhq.com/contacts/');
			url.searchParams.set('page', String(page))
			url.searchParams.set('limit', String(pageLimit))
			if (since) url.searchParams.set('dateUpdated[gt]', since)

			const resp = await fetch(url.toString(), { headers })
			if (!resp.ok) {
				const text = await resp.text().catch(() => '')
				return NextResponse.json({ error: `GHL contacts fetch failed ${resp.status}`, details: text }, { status: 502 })
			}
			const data = await resp.json()
			const list: any[] = data.contacts || data.items || data.data || []
			hasMore = Boolean(data.hasMore) || (Array.isArray(list) && list.length === pageLimit)
			totalFetched += list.length
			page += 1

			const batch = list.map(mapContact)
			await upsertBatch(batch)
		}

		return NextResponse.json({
			success: true,
			accountId,
			totalFetched,
			insertedOrUpdated,
			dryRun,
		})
	} catch (e: any) {
		console.error('Contacts sync error:', e)
		return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
	}
}

export async function GET() {
	return NextResponse.json({ message: 'Sync GHL Contacts: POST { accountId, since?, limit?, dryRun? }' })
} 