import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function FeedbackPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Send Feedback</h1>
            <p className="text-muted-foreground mt-2">
              Help us improve Promethean by sharing your thoughts and suggestions
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>We'd love to hear from you</CardTitle>
              <CardDescription>
                Your feedback helps us build better features and improve your experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email (optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="feedback">Your Feedback</Label>
                <Textarea
                  id="feedback"
                  placeholder="Tell us what you think..."
                  className="min-h-[120px]"
                />
              </div>
              
              <Button className="w-full">
                Send Feedback
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 