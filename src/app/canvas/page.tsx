"use client"

import { LayoutWrapper } from "@/components/layout/layout-wrapper"
import { CanvasProvider } from "@/lib/canvas-context"
import { CanvasWorkspace } from "@/components/canvas/canvas-workspace"

export default function CanvasPage() {
  return (
    <LayoutWrapper>
      <CanvasProvider>
        <CanvasWorkspace />
      </CanvasProvider>
    </LayoutWrapper>
  )
}

