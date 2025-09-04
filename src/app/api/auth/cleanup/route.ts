import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    
    // Get all cookies
    const allCookies = cookieStore.getAll()
    
    // Only clear cookies that are actually corrupted
    allCookies.forEach(cookie => {
      // Only delete if the cookie value is corrupted (starts with base64-)
      if (cookie.value.startsWith('base64-') && cookie.name.startsWith('sb-')) {
        console.log('Clearing corrupted cookie:', cookie.name)
        cookieStore.delete(cookie.name)
      }
    })
    
    // Redirect to login page
    return NextResponse.redirect(new URL('/login', request.url))
  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json({ error: 'Failed to cleanup' }, { status: 500 })
  }
} 