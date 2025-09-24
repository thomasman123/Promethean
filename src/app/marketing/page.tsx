'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export default function MarketingPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        console.log('Auth check failed:', error)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [supabase])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="text-2xl font-bold text-indigo-900">
            Promethean
          </div>
          <div className="space-x-4">
            {loading ? (
              <div className="animate-pulse bg-gray-200 h-8 w-24 rounded"></div>
            ) : user ? (
              // Authenticated user - show Dashboard button
              <Link 
                href="https://app.getpromethean.com/dashboard"
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium"
              >
                Go to Dashboard
              </Link>
            ) : (
              // Non-authenticated user - show Login/Signup
              <>
                <Link 
                  href="https://app.getpromethean.com/login"
                  className="text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Login
                </Link>
                <Link 
                  href="https://app.getpromethean.com/signup"
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Modern Data Analytics Platform
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            Transform your business data into actionable insights with Promethean's 
            powerful analytics and reporting tools.
          </p>
          
          <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
            {user ? (
              // Authenticated user - single Dashboard CTA
              <Link 
                href="https://app.getpromethean.com/dashboard"
                className="bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700 font-semibold text-lg inline-block"
              >
                Go to Dashboard
              </Link>
            ) : (
              // Non-authenticated user - signup and login CTAs
              <>
                <Link 
                  href="https://app.getpromethean.com/signup"
                  className="bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700 font-semibold text-lg inline-block"
                >
                  Start Free Trial
                </Link>
                <Link 
                  href="https://app.getpromethean.com/login"
                  className="border border-indigo-600 text-indigo-600 px-8 py-3 rounded-lg hover:bg-indigo-50 font-semibold text-lg inline-block"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="max-w-6xl mx-auto mt-20">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                📊
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Real-time Analytics
              </h3>
              <p className="text-gray-600">
                Monitor your business metrics in real-time with customizable dashboards and alerts.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                🔗
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Easy Integrations
              </h3>
              <p className="text-gray-600">
                Connect with GoHighLevel, Meta Ads, and other platforms seamlessly.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                👥
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Team Collaboration
              </h3>
              <p className="text-gray-600">
                Invite team members and manage permissions with role-based access control.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="px-6 py-12 mt-20 border-t border-gray-200">
        <div className="max-w-7xl mx-auto text-center text-gray-600">
          <p>&copy; 2024 Promethean. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
} 