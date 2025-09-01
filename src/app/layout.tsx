import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Promethean Dashboard",
  description: "Sales performance analytics and management platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
} 