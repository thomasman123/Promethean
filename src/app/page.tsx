'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, BarChart3, TrendingUp, DollarSign, Phone, Users, Zap, Globe, Shield, LineChart } from 'lucide-react'
import { DashboardPreview } from '@/components/landing/dashboard-preview'
import { AnimatedGridPattern } from '@/components/ui/animated-grid-pattern'
import { BlurFade } from '@/components/ui/blur-fade'
import { NumberTicker } from '@/components/ui/number-ticker'
import { cn } from '@/lib/utils'

export default function LandingPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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
    <div className="min-h-screen bg-background relative">
      {/* Animated Background Pattern */}
      <AnimatedGridPattern
        numSquares={30}
        maxOpacity={0.1}
        duration={3}
        repeatDelay={1}
        className={cn(
          "[mask-image:radial-gradient(500px_circle_at_center,white,transparent)]",
          "fixed inset-0 h-full w-full -z-10"
        )}
      />
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">Promethean</span>
            </div>
            <div className="flex items-center gap-4">
              {loading ? (
                <div className="animate-pulse bg-muted h-9 w-24 rounded-md"></div>
              ) : user ? (
                <Button asChild>
                  <Link href="/dashboard">
                    Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button variant="ghost" asChild>
                    <Link href="/login">Log In</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/signup">
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <BlurFade delay={0.1} inView>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                Turn Your Sales Data Into Revenue
              </h1>
            </BlurFade>
            <BlurFade delay={0.2} inView>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                The all-in-one analytics platform for sales teams. Track performance, optimize conversions, and maximize ROI with real-time insights.
              </p>
            </BlurFade>
            <BlurFade delay={0.3} inView>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {user ? (
                  <Button size="lg" asChild>
                    <Link href="/dashboard">
                      Go to Dashboard
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Button size="lg" asChild>
                      <Link href="/signup">
                        Start Free Trial
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Link>
                    </Button>
                    <Button size="lg" variant="outline" asChild>
                      <Link href="/login">Sign In</Link>
                    </Button>
                  </>
                )}
              </div>
            </BlurFade>
          </div>

          {/* Interactive Dashboard Preview */}
          <BlurFade delay={0.4} inView>
            <DashboardPreview />
          </BlurFade>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to Scale
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed for high-performing sales teams
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Real-Time Analytics</CardTitle>
                <CardDescription>
                  Monitor key metrics like appointments, show-ups, and cash collected as they happen
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>ROI Tracking</CardTitle>
                <CardDescription>
                  Connect your ad spend to revenue. See exactly what's working and optimize your campaigns
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Phone className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Call Analytics</CardTitle>
                <CardDescription>
                  Track dials, answer rates, meaningful conversations, and booking rates per rep
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Team Performance</CardTitle>
                <CardDescription>
                  Individual dashboards for each team member with attribution-based metrics
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Seamless Integrations</CardTitle>
                <CardDescription>
                  Connect GoHighLevel, Meta Ads, and more. Data syncs automatically in real-time
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <LineChart className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Custom Dashboards</CardTitle>
                <CardDescription>
                  Build personalized views with drag-and-drop widgets. Track what matters to you
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Metrics Showcase */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Track Every Metric That Matters
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From lead generation to cash collected, get complete visibility into your sales funnel
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Appointments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  <NumberTicker value={1284} />
                </div>
                <p className="text-sm text-muted-foreground mt-1">+12.5% from last month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Show Up Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  <NumberTicker value={68.2} decimalPlaces={1} />%
                </div>
                <p className="text-sm text-muted-foreground mt-1">+3.2% from last month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Cash Collected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  $<NumberTicker value={487} />K
                </div>
                <p className="text-sm text-muted-foreground mt-1">+18.7% from last month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  ROI Multiplier
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  <NumberTicker value={8.4} decimalPlaces={1} />x
                </div>
                <p className="text-sm text-muted-foreground mt-1">+1.2x from last month</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Integrates With Your Stack
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Connect your existing tools and centralize all your data
            </p>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
            <div className="flex items-center gap-3 px-6 py-3 rounded-lg bg-card border">
              <Globe className="h-8 w-8 text-primary" />
              <span className="text-xl font-semibold">GoHighLevel</span>
            </div>
            <div className="flex items-center gap-3 px-6 py-3 rounded-lg bg-card border">
              <BarChart3 className="h-8 w-8 text-primary" />
              <span className="text-xl font-semibold">Meta Ads</span>
            </div>
            <div className="flex items-center gap-3 px-6 py-3 rounded-lg bg-card border">
              <Shield className="h-8 w-8 text-primary" />
              <span className="text-xl font-semibold">More Coming Soon</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Scale Your Sales?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join the teams already using Promethean to track, optimize, and scale their revenue
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Button size="lg" asChild>
                <Link href="/dashboard">
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            ) : (
              <>
                <Button size="lg" asChild>
                  <Link href="/signup">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">Promethean</span>
            </div>
            <p className="text-muted-foreground">
              &copy; {new Date().getFullYear()} Promethean. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
