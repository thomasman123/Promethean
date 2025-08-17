import { NextResponse } from 'next/server'

export async function POST() {
	const res = NextResponse.json({ ok: true })
	res.cookies.set('recovery_pending', '1', {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		maxAge: 60 * 60, // 1 hour
	})
	return res
} 