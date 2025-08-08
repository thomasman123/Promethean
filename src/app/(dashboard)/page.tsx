import Link from "next/link"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { ThemeToggle } from "@/components/theme-toggle"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bot, MegaphoneIcon } from "lucide-react"

export default function Home() {
  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Dashboard</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="grid auto-rows-min gap-4 md:grid-cols-3">
          <div className="bg-muted/50 aspect-video rounded-xl" />
          <div className="bg-muted/50 aspect-video rounded-xl" />
          <div className="bg-muted/50 aspect-video rounded-xl" />
        </div>
        <div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Getting Started
              </CardTitle>
              <MegaphoneIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Ads Management</div>
              <p className="text-xs text-muted-foreground">
                Set up and manage your advertising campaigns
              </p>
              <Link href="/ads" className="text-sm text-primary hover:underline mt-2 block">
                Go to Ads →
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                AI-Powered Tools
              </CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">AI Tools</div>
              <p className="text-xs text-muted-foreground">
                Leverage AI for call analysis and insights
              </p>
              <Link href="/ai-tools" className="text-sm text-primary hover:underline mt-2 block">
                Explore AI Tools →
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Data & Analytics
              </CardTitle>
              <div className="h-4 w-4 bg-primary rounded-full" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Dashboard</div>
              <p className="text-xs text-muted-foreground">
                View your key metrics and performance
              </p>
              <Link href="/dashboard" className="text-sm text-primary hover:underline mt-2 block">
                View Dashboard →
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Quick Actions
              </CardTitle>
              <div className="h-4 w-4 bg-secondary rounded-full" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Get Started</div>
              <p className="text-xs text-muted-foreground">
                Quick access to common tasks
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </SidebarInset>
  )
}
