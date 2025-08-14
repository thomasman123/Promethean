'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  SidebarInset, 
  SidebarTrigger 
} from '@/components/ui/sidebar';
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from '@/components/ui/breadcrumb';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAuth } from '@/hooks/useAuth';

export default function SourceMappingPage() {
  const { getAccountBasedPermissions } = useAuth();
  const permissions = getAccountBasedPermissions();
  const router = useRouter();

  // Check permissions
  useEffect(() => {
    if (!permissions.canManageAccount) {
      router.replace('/dashboard');
      return;
    }
  }, [permissions.canManageAccount, router]);

  // Show access denied if no permissions
  if (!permissions.canManageAccount) {
    return (
      <SidebarInset>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-lg font-semibold">Access Denied</h2>
            <p className="text-muted-foreground">You need moderator permissions to access source mapping.</p>
          </div>
        </div>
      </SidebarInset>
    );
  }

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="/account">Account</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>Source Mapping</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>

      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Source Attribution Mapping</h1>
          <p className="text-muted-foreground mt-2">
            Map GHL sources to your business categories and track detailed attribution
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Source Mapping Configuration</CardTitle>
            <CardDescription>
              The source mapping system has been set up. Database migration completed successfully.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                <h3 className="font-medium text-green-800">✅ Migration Applied Successfully</h3>
                <p className="text-sm text-green-700 mt-1">
                  New database tables have been created and existing data has been processed.
                </p>
              </div>
              
              <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                <h3 className="font-medium text-blue-800">🔧 Next Steps</h3>
                <p className="text-sm text-blue-700 mt-1">
                  The full interface will be available once the TypeScript types are properly generated and loaded.
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <h3 className="font-medium">How Source Attribution Works</h3>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                  <li>• GHL source is automatically captured from appointment webhooks</li>
                  <li>• Sources are mapped to business categories (discovery, funnel, organic, etc.)</li>
                  <li>• You can specify detailed attribution like funnel names or campaigns</li>
                  <li>• System is ready for future Meta ads integration</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  );
} 