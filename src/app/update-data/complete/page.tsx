"use client"

import { LayoutWrapper } from "@/components/layout/layout-wrapper"
import { OrderedDataFlow } from "@/components/update-data/ordered-data-flow"

export default function CompletePage() {
  return (
    <LayoutWrapper>
      <div className="container max-w-6xl mx-auto">
        <OrderedDataFlow />
      </div>
    </LayoutWrapper>
  )
}

