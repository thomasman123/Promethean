"use client"

import { TopBar } from "@/components/layout/topbar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Copy } from "lucide-react"
import { useState } from "react"

export default function AdvancedTrackingPage() {
  const [copied, setCopied] = useState<string>("")

  const copy = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(""), 1500)
  }

  const pixelSnippet = `<script src="https://www.getpromethean.com/promethean-attribution.js" async></script>`
  const ghlWebhook = `POST https://www.getpromethean.com/api/attribution/track`

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="pt-16 p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Advanced Tracking</h1>
            <p className="text-muted-foreground mt-1">Set up high‑accuracy end‑to‑end tracking to attribute booked calls and sales to Meta Ads, down to the ad level.</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>1) Install Promethean Pixel on your funnel</CardTitle>
              <CardDescription>Add this snippet to all pages on your funnel or website, ideally in the global header.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-md bg-muted font-mono text-sm break-all">{pixelSnippet}</div>
              <Button variant="outline" size="sm" onClick={() => copy("pixel", pixelSnippet)}>
                <Copy className="h-4 w-4 mr-2" /> {copied === "pixel" ? "Copied" : "Copy snippet"}
              </Button>
              <ul className="list-disc ml-5 text-sm text-muted-foreground space-y-1">
                <li>Automatically captures UTM parameters, fbclid, fbc/fbp, gclid, referrer, and landing URL.</li>
                <li>Stores a durable session identifier to link contacts and appointments reliably.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2) Configure GHL/Form Webhooks</CardTitle>
              <CardDescription>Send form submissions and contact creation events to Promethean for attribution linking.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3">
                <div>
                  <div className="text-sm font-medium">Webhook Endpoint</div>
                  <div className="p-3 rounded-md bg-muted font-mono text-sm break-all">{ghlWebhook}</div>
                  <Button variant="outline" size="sm" onClick={() => copy("webhook", ghlWebhook)}>
                    <Copy className="h-4 w-4 mr-2" /> {copied === "webhook" ? "Copied" : "Copy endpoint"}
                  </Button>
                </div>
              </div>
              <ul className="list-disc ml-5 text-sm text-muted-foreground space-y-1">
                <li>Include email and phone if available. We’ll also match by cookies/session for 90%+ accuracy.</li>
                <li>Send appointment booked and status updates to keep attribution in sync with pipeline changes.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3) Meta Ads Setup</CardTitle>
              <CardDescription>Ensure your campaigns propagate all tracking parameters and allow daily insights.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <ul className="list-disc ml-5 text-sm text-muted-foreground space-y-1">
                <li>Append UTM parameters to all ad URLs (utm_source, utm_medium, utm_campaign, utm_content, utm_term, utm_id).</li>
                <li>Enable click ID collection (fbclid auto) and ensure Pixel is active on all steps.</li>
                <li>Daily insights are fetched hourly; today’s partial data is updated each hour.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4) Sales Linking</CardTitle>
              <CardDescription>We link appointments to contacts and to the originating session/ad. Sales are attributed to the ad level.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <ul className="list-disc ml-5 text-sm text-muted-foreground space-y-1">
                <li>When an appointment is marked Won, the associated contact journey is resolved to a Meta ad and campaign.</li>
                <li>Attribution fields are embedded on appointments and available in metrics for ROI/CPBC by rep and setter.</li>
              </ul>
              <div className="text-xs text-muted-foreground">Need help? Contact support and we’ll verify your funnel and ad configuration.</div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-2">
            <Badge variant="secondary">Guide</Badge>
            <div className="text-sm text-muted-foreground">This guide can be refined further with your funnel specifics.</div>
          </div>
        </div>
      </main>
    </div>
  )
} 