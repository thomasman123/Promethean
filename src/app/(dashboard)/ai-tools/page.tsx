import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bot } from "lucide-react"

export default function AIToolsPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">AI Tools</h1>
        <p className="text-muted-foreground">Explore AI-powered features for analysis and insights.</p>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Call Analysis
              </CardTitle>
              <CardDescription>
                Analyze call transcripts and extract insights.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Upload or sync calls to get AI-driven breakdowns.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 