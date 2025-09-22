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
  const ghlAppointmentsWebhook = `POST https://www.getpromethean.com/api/webhooks/ghl/appointments`
  const optionalFormWebhook = `POST https://www.getpromethean.com/api/attribution/track`
  const metaUtmTemplate = `?utm_source=facebook&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&utm_term={{adset.name}}&utm_id={{campaign.id}}_{{adset.id}}_{{ad.id}}`

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
              <CardTitle>2) Configure GHL Appointment Webhook</CardTitle>
              <CardDescription>Contacts are linked automatically from the appointment webhook. Point your GHL appointment event here.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm font-medium">Primary Webhook Endpoint (Appointments)</div>
                <div className="p-3 rounded-md bg-muted font-mono text-sm break-all">{ghlAppointmentsWebhook}</div>
                <Button variant="outline" size="sm" onClick={() => copy("appt", ghlAppointmentsWebhook)}>
                  <Copy className="h-4 w-4 mr-2" /> {copied === "appt" ? "Copied" : "Copy endpoint"}
                </Button>
              </div>
              <ul className="list-disc ml-5 text-sm text-muted-foreground space-y-1">
                <li>We link the appointment → contact → original session automatically (no separate contact‑creation webhook required).</li>
                <li>Include appointment metadata (times, user IDs) so we can attribute to the correct rep/setter.</li>
              </ul>
              <div className="pt-2">
                <div className="text-xs font-medium">Optional: Standalone form submissions</div>
                <div className="p-3 rounded-md bg-muted font-mono text-xs break-all">{optionalFormWebhook}</div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => copy("form", optionalFormWebhook)}>
                    <Copy className="h-4 w-4 mr-2" /> {copied === "form" ? "Copied" : "Copy optional endpoint"}
                  </Button>
                  <span className="text-xs text-muted-foreground">Use only if you capture leads outside the appointment flow.</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3) Meta Ads Setup</CardTitle>
              <CardDescription>Append UTM parameters to all ad URLs and enable daily insights.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm font-medium">Recommended UTM Template</div>
                <div className="p-3 rounded-md bg-muted font-mono text-sm break-all">{metaUtmTemplate}</div>
                <Button variant="outline" size="sm" onClick={() => copy("utm", metaUtmTemplate)}>
                  <Copy className="h-4 w-4 mr-2" /> {copied === "utm" ? "Copied" : "Copy template"}
                </Button>
              </div>
              <ul className="list-disc ml-5 text-sm text-muted-foreground space-y-1">
                <li>Paste the template at the end of each ad’s Destination URL (after your base link, add the template starting with <code className="font-mono">?</code>).</li>
                <li>Meta supports dynamic macros like <code className="font-mono">{'{{campaign.name}}'}</code>, <code className="font-mono">{'{{adset.name}}'}</code>, <code className="font-mono">{'{{ad.name}}'}</code> and IDs.</li>
                <li>Keep the Promethean pixel on every page; fbclid/fbc/fbp are captured automatically for stitching.</li>
                <li>Daily insights are fetched hourly; the current day is refreshed each hour.</li>
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