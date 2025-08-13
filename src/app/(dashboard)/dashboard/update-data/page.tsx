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
						<CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Complete Data Flow</CardTitle>
						<CardDescription>Fill appointments and discoveries in one guided flow</CardDescription>
					</CardHeader>
					<CardContent>
						<Link href="/dashboard/update-data/flow">
							<Button className="gap-2">Start Data Updates <ChevronRight className="h-4 w-4" /></Button>
						</Link>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Quick Stats</CardTitle>
						<CardDescription>Your pending data completion status</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							<div className="flex justify-between text-sm">
								<span>Appointments pending:</span>
								<span className="font-medium">2</span>
							</div>
							<div className="flex justify-between text-sm">
								<span>Discoveries pending:</span>
								<span className="font-medium">0</span>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
} 