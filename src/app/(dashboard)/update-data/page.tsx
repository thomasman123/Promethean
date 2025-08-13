"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ClipboardList, ChevronRight } from "lucide-react";

export default function UpdateDataPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="rounded-lg bg-primary/10 border p-6">
        <h1 className="text-2xl font-bold">Update Data</h1>
        <p className="text-muted-foreground">Complete outcomes for appointments and discoveries assigned to you.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Appointments</CardTitle>
            <CardDescription>Fill Show/No-Show, outcomes, objections and lead quality</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/appointments">
              <Button className="gap-2">Open My Appointment Updates <ChevronRight className="h-4 w-4" /></Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Discoveries</CardTitle>
            <CardDescription>Capture discovery outcomes (coming soon)</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" disabled className="gap-2">Coming soon</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 