import Link from "next/link"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { ThemeToggle } from "@/components/theme-toggle"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bot, MegaphoneIcon } from "lucide-react"

export default function Home() {
  return (
    <SidebarProvider>
      <AppSidebar />
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
          <div className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">Welcome</h1>
            <p className="text-muted-foreground">Select a tool to get started.</p>

            <div className="grid gap-4 md:grid-cols-2">
              <Link href="#" aria-disabled>
                <Card className="hover:shadow-md transition-shadow cursor-pointer opacity-90">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="h-5 w-5" />
                      AI Tools
                    </CardTitle>
                    <CardDescription>
                      Call analysis, KPI breakdown and more.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Coming soon.</p>
                  </CardContent>
                </Card>
              </Link>

              <Link href="#" aria-disabled>
                <Card className="hover:shadow-md transition-shadow cursor-pointer opacity-90">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MegaphoneIcon className="h-5 w-5" />
                      Ads
                    </CardTitle>
                    <CardDescription>
                      Manage ad campaigns and setup.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Coming soon.</p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
