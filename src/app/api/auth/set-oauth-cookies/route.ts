import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { selectedAccountId, userId } = await request.json()
    
    if (!selectedAccountId || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters' }, 
        { status: 400 }
      )
    }
    
    console.log('🔍 [set-oauth-cookies] Setting OAuth cookies server-side:', {
      selectedAccountId,
      userId
    })
    
    const cookieStore = await cookies()
    const timestamp = Date.now().toString()
    
    // Set cookies with proper options
    const cookieOptions = {
      httpOnly: false, // Allow client-side access
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 7200, // 2 hours
      path: '/'
    }
    
    cookieStore.set('selectedAccountId', selectedAccountId, cookieOptions)
    cookieStore.set('oauth_userId', userId, cookieOptions)
    cookieStore.set('oauth_timestamp', timestamp, cookieOptions)
    
    console.log('✅ [set-oauth-cookies] OAuth cookies set successfully')
    
    return NextResponse.json({ 
      success: true,
      timestamp,
      cookies: ['selectedAccountId', 'oauth_userId', 'oauth_timestamp']
    })
  } catch (error) {
    console.error('❌ [set-oauth-cookies] Error:', error)
    return NextResponse.json(
      { error: 'Failed to set cookies' }, 
      { status: 500 }
    )
  }
} 