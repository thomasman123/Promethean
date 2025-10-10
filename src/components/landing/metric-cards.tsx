"use client";

import { AnimatedCard, CardBody, CardDescription, CardTitle, CardVisual, Visual3 } from "@/components/ui/animated-card-chart";

export function MetricCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <AnimatedCard>
        <CardVisual>
          <Visual3 mainColor="hsl(var(--chart-1))" secondaryColor="hsl(var(--chart-2))" />
        </CardVisual>
        <CardBody>
          <CardTitle>Total Appointments</CardTitle>
          <CardDescription>
            Track all booked appointments in real-time
          </CardDescription>
        </CardBody>
      </AnimatedCard>

      <AnimatedCard>
        <CardVisual>
          <Visual3 mainColor="hsl(var(--chart-2))" secondaryColor="hsl(var(--chart-3))" />
        </CardVisual>
        <CardBody>
          <CardTitle>Show Up Rate</CardTitle>
          <CardDescription>
            Monitor attendance and engagement metrics
          </CardDescription>
        </CardBody>
      </AnimatedCard>

      <AnimatedCard>
        <CardVisual>
          <Visual3 mainColor="hsl(var(--chart-3))" secondaryColor="hsl(var(--chart-4))" />
        </CardVisual>
        <CardBody>
          <CardTitle>Cash Collected</CardTitle>
          <CardDescription>
            Real-time revenue tracking and analytics
          </CardDescription>
        </CardBody>
      </AnimatedCard>

      <AnimatedCard>
        <CardVisual>
          <Visual3 mainColor="hsl(var(--chart-4))" secondaryColor="hsl(var(--chart-5))" />
        </CardVisual>
        <CardBody>
          <CardTitle>ROI Multiplier</CardTitle>
          <CardDescription>
            Calculate return on your ad spend
          </CardDescription>
        </CardBody>
      </AnimatedCard>
    </div>
  );
}

