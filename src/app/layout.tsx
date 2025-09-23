import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { DashboardProvider } from "@/lib/dashboard-context";
import { ImpersonationBar } from "@/components/layout/impersonation-bar";
import { BubbleBackground } from "@/components/ui/bubble-background";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Promethean App",
  description: "Analytics Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={cn(
        inter.className,
        "min-h-screen bg-background font-sans antialiased relative"
      )}>
        <BubbleBackground />
        <div className="relative z-10 min-h-screen">
          <DashboardProvider>
            <ImpersonationBar />
            {children}
          </DashboardProvider>
        </div>
      </body>
    </html>
  );
} 