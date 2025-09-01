import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ExternalLink, Mail, MessageCircle } from "lucide-react"

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Support Center</h1>
            <p className="text-muted-foreground mt-2">
              Get help with Promethean and find answers to common questions
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Live Chat
                </CardTitle>
                <CardDescription>
                  Get instant help from our support team
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">
                  Start Chat
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Support
                </CardTitle>
                <CardDescription>
                  Send us an email and we'll get back to you
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  <Mail className="h-4 w-4 mr-2" />
                  support@promethean.com
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="h-5 w-5" />
                  Knowledge Base
                </CardTitle>
                <CardDescription>
                  Browse our documentation and guides
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Docs
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">How do I connect GoHighLevel?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Go to Account → CRM Connection and click "Connect to GoHighLevel" to start the OAuth process.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Why aren't my webhooks working?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Make sure your GHL connection is properly configured and that you have the correct permissions in your GHL sub-account.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">How do I set up calendar mappings?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    After connecting GHL, go to Account → Calendar Mapping to configure which calendars sync to appointments or discoveries.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 