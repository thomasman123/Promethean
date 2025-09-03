import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Promethean</CardTitle>
          <CardDescription>Backend ready for your custom frontend</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            shadcn/ui components installed and ready for customization.
          </p>
          <Button className="w-full">Get Started</Button>
        </CardContent>
      </Card>
    </main>
  )
} 