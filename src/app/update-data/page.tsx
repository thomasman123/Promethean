"use client"

import { TopBar } from "@/components/layout/topbar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

export default function UpdateDataPage() {
  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      
      <main className="pt-16 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Update Data</h1>
            <p className="text-muted-foreground">
              Sync and update your data from external sources
            </p>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Data Sources</CardTitle>
              <CardDescription>
                Select which data sources to update
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Production Database</h3>
                  <p className="text-sm text-muted-foreground">Last updated: 2 hours ago</p>
                </div>
                <Button size="sm" variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Analytics Data</h3>
                  <p className="text-sm text-muted-foreground">Last updated: 1 day ago</p>
                </div>
                <Button size="sm" variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">User Metrics</h3>
                  <p className="text-sm text-muted-foreground">Last updated: 5 minutes ago</p>
                </div>
                <Button size="sm" variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
} 