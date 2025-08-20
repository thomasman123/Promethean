import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

type AggRow = Partial<Record<string, string[]>>

function pushIf<T>(arr: T[], v: T | null | undefined) { if (v != null && v !== '' && (String(v)).toLowerCase() !== 'null') arr.push(v) }

export async function GET(request: NextRequest) {
	try {
		const url = new URL(request.url)
		const accountId = url.searchParams.get('accountId')
		if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 })

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

		// Auth check
		const { data: { session } } = await supabase.auth.getSession()
		if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

		// Pull attribution JSON from contacts and extract unique values
		const { data: contacts, error } = await supabase
			.from('contacts')
			.select('attribution_source, last_attribution_source')
			.eq('account_id', accountId)

		if (error) throw error

		const utm_source: string[] = []
		const utm_medium: string[] = []
		const utm_campaign: string[] = []
		const utm_content: string[] = []
		const utm_term: string[] = []
		const utm_id: string[] = []
		const session_source: string[] = []
		const referrer: string[] = []
		const fbclid: string[] = []
		const fbc: string[] = []
		const fbp: string[] = []
		const gclid: string[] = []

		for (const row of contacts || []) {
			const a = (row as any).attribution_source || {}
			const l = (row as any).last_attribution_source || {}
			pushIf(utm_source, a.utmSource || l.utmSource)
			pushIf(utm_medium, a.utmMedium || l.utmMedium)
			pushIf(utm_campaign, a.campaign || l.campaign)
			pushIf(utm_content, a.utmContent || l.utmContent)
			pushIf(utm_term, a.utmTerm || l.utmTerm)
			pushIf(utm_id, a.utm_id || l.utm_id)
			pushIf(session_source, a.sessionSource || l.sessionSource)
			pushIf(referrer, a.referrer || l.referrer)
			pushIf(fbclid, a.fbclid || l.fbclid)
			pushIf(fbc, a.fbc || l.fbc)
			pushIf(fbp, a.fbp || l.fbp)
			pushIf(gclid, a.gclid || l.gclid)
		}

		const uniq = (arr: string[]) => Array.from(new Set(arr.filter(Boolean))).slice(0, 200)

		const result: Record<string, string[]> = {
			utm_source: uniq(utm_source),
			utm_medium: uniq(utm_medium),
			utm_campaign: uniq(utm_campaign),
			utm_content: uniq(utm_content),
			utm_term: uniq(utm_term),
			utm_id: uniq(utm_id),
			session_source: uniq(session_source),
			referrer: uniq(referrer),
			// Not available post-refactor from raw contacts without reclassification
			source_category: [],
			specific_source: [],
			fbclid: uniq(fbclid),
			fbc: uniq(fbc),
			fbp: uniq(fbp),
			gclid: uniq(gclid),
		}

		return NextResponse.json(result)
	} catch (e) {
		console.error('Metrics options error:', e)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
} 