import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    
    // Get all cookies
    const allCookies = cookieStore.getAll()
    
    // Clear any Supabase-related cookies
    allCookies.forEach(cookie => {
      if (
        cookie.name.startsWith('sb-') || 
        cookie.name.includes('supabase') ||
        cookie.name.includes('auth') ||
        cookie.value.startsWith('base64-')
      ) {
        console.log('Clearing cookie:', cookie.name)
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