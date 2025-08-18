import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

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

		const fields = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','utm_id','source_category','specific_source','session_source','contact_referrer']
		const result: Record<string, string[]> = {}

		for (const f of fields) {
			const col = f
			const sets: string[][] = []
			// appointments
			const { data: a } = await supabase
				.from('appointments')
				.select(col)
				.eq('account_id', accountId)
				.not(col as any, 'is', null as any)
			if (a) sets.push(Array.from(new Set(a.map((r: any) => r[col]).filter(Boolean))))
			// discoveries
			const { data: d } = await supabase
				.from('discoveries')
				.select(col)
				.eq('account_id', accountId)
				.not(col as any, 'is', null as any)
			if (d) sets.push(Array.from(new Set(d.map((r: any) => r[col]).filter(Boolean))))
			// dials
			const { data: dl } = await supabase
				.from('dials')
				.select(col)
				.eq('account_id', accountId)
				.not(col as any, 'is', null as any)
			if (dl) sets.push(Array.from(new Set(dl.map((r: any) => r[col]).filter(Boolean))))

			result[f === 'contact_referrer' ? 'referrer' : f] = Array.from(new Set((sets.flat()).filter(Boolean))).slice(0, 200)
		}

		return NextResponse.json(result)
	} catch (e) {
		console.error('Metrics options error:', e)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
} 