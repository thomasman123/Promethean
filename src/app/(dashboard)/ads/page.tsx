import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MegaphoneIcon } from "lucide-react"

export default function AdsPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Ads Management</h1>
        <p className="text-muted-foreground">Manage your advertising campaigns and track performance.</p>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MegaphoneIcon className="h-5 w-5" />
                Campaign Setup
              </CardTitle>
              <CardDescription>
                Create and configure new advertising campaigns.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Set up targeting, budgets, and creative assets for your campaigns.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MegaphoneIcon className="h-5 w-5" />
                Active Campaigns
              </CardTitle>
              <CardDescription>
                Monitor and manage your running campaigns.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">View performance metrics and make real-time adjustments.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 