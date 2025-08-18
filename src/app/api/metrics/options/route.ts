import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

type AggRow = Partial<Record<string, string[]>>

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

		// Query aggregated distincts per table (minimizes round-trips)
		const apptSelect = [
			'array_remove(array_agg(distinct utm_source), null) as utm_source',
			'array_remove(array_agg(distinct utm_medium), null) as utm_medium',
			'array_remove(array_agg(distinct utm_campaign), null) as utm_campaign',
			'array_remove(array_agg(distinct utm_content), null) as utm_content',
			'array_remove(array_agg(distinct utm_term), null) as utm_term',
			'array_remove(array_agg(distinct utm_id), null) as utm_id',
			'array_remove(array_agg(distinct source_category), null) as source_category',
			'array_remove(array_agg(distinct specific_source), null) as specific_source',
			'array_remove(array_agg(distinct session_source), null) as session_source',
			'array_remove(array_agg(distinct contact_referrer), null) as contact_referrer'
		].join(', ')

		const discSelect = [
			'array_remove(array_agg(distinct utm_source), null) as utm_source',
			'array_remove(array_agg(distinct utm_medium), null) as utm_medium',
			'array_remove(array_agg(distinct utm_campaign), null) as utm_campaign',
			'array_remove(array_agg(distinct session_source), null) as session_source',
			'array_remove(array_agg(distinct contact_referrer), null) as contact_referrer'
		].join(', ')

		const dialSelect = [
			'array_remove(array_agg(distinct utm_source), null) as utm_source',
			'array_remove(array_agg(distinct utm_medium), null) as utm_medium',
			'array_remove(array_agg(distinct utm_campaign), null) as utm_campaign',
			'array_remove(array_agg(distinct session_source), null) as session_source',
			'array_remove(array_agg(distinct contact_referrer), null) as contact_referrer'
		].join(', ')

		const [aRes, dRes, dlRes] = await Promise.all([
			supabase.from('appointments').select(apptSelect).eq('account_id', accountId).maybeSingle(),
			supabase.from('discoveries').select(discSelect).eq('account_id', accountId).maybeSingle(),
			supabase.from('dials').select(dialSelect).eq('account_id', accountId).maybeSingle(),
		])

		const aRow = (aRes.data || {}) as AggRow
		const dRow = (dRes.data || {}) as AggRow
		const dlRow = (dlRes.data || {}) as AggRow

		const readKey = (row: AggRow, key: string): string[] => (row[key] as string[] | undefined) || []
		const agg = (key: string) => Array.from(new Set([
			...readKey(aRow, key),
			...readKey(dRow, key),
			...readKey(dlRow, key),
		])).slice(0, 200)

		const result: Record<string, string[]> = {
			utm_source: agg('utm_source'),
			utm_medium: agg('utm_medium'),
			utm_campaign: agg('utm_campaign'),
			utm_content: readKey(aRow, 'utm_content').slice(0, 200),
			utm_term: readKey(aRow, 'utm_term').slice(0, 200),
			utm_id: readKey(aRow, 'utm_id').slice(0, 200),
			source_category: readKey(aRow, 'source_category').slice(0, 200),
			specific_source: readKey(aRow, 'specific_source').slice(0, 200),
			session_source: agg('session_source'),
			referrer: agg('contact_referrer'),
		}

		return NextResponse.json(result)
	} catch (e) {
		console.error('Metrics options error:', e)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
} 