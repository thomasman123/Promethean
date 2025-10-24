'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { ArrowRight, BarChart3, Globe, Shield } from 'lucide-react'
import { BlurFade } from '@/components/ui/blur-fade'
import { motion } from 'framer-motion'
import { LampContainer } from '@/components/ui/lamp'
import { FeatureCards } from '@/components/landing/feature-cards'
import { MetricCards } from '@/components/landing/metric-cards'

export default function MarketingPage() {
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
      {/* Radial Glow Background */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `radial-gradient(circle 600px at 50% 200px, hsl(var(--primary) / 0.15), transparent)`,
        }}
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
                  <Link href="https://app.getpromethean.com/dashboard">
                    Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button variant="ghost" asChild>
                    <Link href="https://app.getpromethean.com/login">Log In</Link>
                  </Button>
                  <Button asChild>
                    <Link href="https://app.getpromethean.com/signup">
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

      {/* Hero Section with Lamp */}
      <section className="pt-16 relative z-10">
        <LampContainer className="min-h-[600px]">
          <motion.div
            initial={{ opacity: 0.5, y: 100 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.3,
              duration: 0.8,
              ease: "easeInOut",
            }}
            className="text-center max-w-4xl mx-auto px-6"
          >
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
              Turn Your Sales Data Into Revenue
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              The all-in-one analytics platform for sales teams. Track performance, optimize conversions, and maximize ROI with real-time insights.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <Button size="lg" asChild>
                  <Link href="https://app.getpromethean.com/dashboard">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button size="lg" asChild>
                    <Link href="https://app.getpromethean.com/signup">
                      Start Free Trial
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link href="https://app.getpromethean.com/login">Sign In</Link>
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        </LampContainer>
      </section>

      {/* Features Grid with Glowing Cards */}
      <section className="py-20 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <BlurFade delay={0.1} inView>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Everything You Need to Scale
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Powerful features designed for high-performing sales teams
              </p>
            </div>
          </BlurFade>

          <BlurFade delay={0.2} inView>
            <FeatureCards />
          </BlurFade>
        </div>
      </section>

      {/* Metrics Showcase with Animated Charts */}
      <section className="py-20 px-6 relative z-10 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <BlurFade delay={0.1} inView>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Track Every Metric That Matters
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                From lead generation to cash collected, get complete visibility into your sales funnel
              </p>
            </div>
          </BlurFade>

          <BlurFade delay={0.2} inView>
            <MetricCards />
          </BlurFade>
        </div>
      </section>

      {/* Integrations */}
      <section className="py-20 px-6 relative z-10">
        <div className="max-w-7xl mx-auto text-center">
          <BlurFade delay={0.1} inView>
            <div className="mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Integrates With Your Stack
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Connect your existing tools and centralize all your data
              </p>
            </div>
          </BlurFade>

          <BlurFade delay={0.2} inView>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
              <div className="flex items-center gap-3 px-6 py-3 rounded-lg bg-card border hover:border-primary transition-colors">
                <Globe className="h-8 w-8 text-primary" />
                <span className="text-xl font-semibold">GoHighLevel</span>
              </div>
              <div className="flex items-center gap-3 px-6 py-3 rounded-lg bg-card border hover:border-primary transition-colors">
                <BarChart3 className="h-8 w-8 text-primary" />
                <span className="text-xl font-semibold">Meta Ads</span>
              </div>
              <div className="flex items-center gap-3 px-6 py-3 rounded-lg bg-card border hover:border-primary transition-colors">
                <Shield className="h-8 w-8 text-primary" />
                <span className="text-xl font-semibold">More Coming Soon</span>
              </div>
            </div>
          </BlurFade>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 relative z-10 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <BlurFade delay={0.1} inView>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Scale Your Sales?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join the teams already using Promethean to track, optimize, and scale their revenue
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <Button size="lg" asChild>
                  <Link href="https://app.getpromethean.com/dashboard">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button size="lg" asChild>
                    <Link href="https://app.getpromethean.com/signup">
                      Start Free Trial
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link href="https://app.getpromethean.com/login">Sign In</Link>
                  </Button>
                </>
              )}
            </div>
          </BlurFade>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 px-6 relative z-10">
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
