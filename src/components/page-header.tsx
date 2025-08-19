"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

function titleize(segment: string): string {
  const map: Record<string, string> = {
    dashboard: "Dashboard",
    "ai-tools": "AI Tools",
    "utm-rules": "UTM Rules",
    "crm-connection": "CRM Connection",
    "manage-accounts": "Manage Accounts",
    "test-source-mapping": "Test Source Mapping",
  };
  if (map[segment]) return map[segment];
  return segment
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

export function PageHeader() {
  const pathname = usePathname() || "/";

  const crumbs = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    const items: Array<{ href?: string; label: string }> = [];

    // Always start with Dashboard when inside app routes
    items.push({ href: "/dashboard", label: "Dashboard" });

    let href = "";
    for (const part of parts) {
      if (part === "dashboard") {
        href = "/dashboard";
        continue; // already added
      }
      href += `/${part}`;
      items.push({ href, label: titleize(part) });
    }

    // De-duplicate consecutive Dashboard if root is exactly /dashboard
    const deduped = items.reduce<Array<{ href?: string; label: string }>>((acc, it, idx) => {
      if (idx > 0 && it.label === "Dashboard" && acc[acc.length - 1]?.label === "Dashboard") return acc;
      return acc.concat(it);
    }, []);

    return deduped;
  }, [pathname]);

  const lastIndex = crumbs.length - 1;

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          {crumbs.map((c, idx) => (
            <>
              {idx < lastIndex ? (
                <BreadcrumbItem key={`${c.label}-${idx}`} className="hidden md:block">
                  <BreadcrumbLink href={c.href || "#"}>{c.label}</BreadcrumbLink>
                </BreadcrumbItem>
              ) : (
                <BreadcrumbItem key={`${c.label}-${idx}`}>
                  <BreadcrumbPage>{c.label}</BreadcrumbPage>
                </BreadcrumbItem>
              )}
              {idx < lastIndex && <BreadcrumbSeparator className="hidden md:block" />}
            </>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </header>
  );
} 