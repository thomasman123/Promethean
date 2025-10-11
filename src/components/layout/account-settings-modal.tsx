"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Settings, Building2, Rocket, Users } from "lucide-react"

interface AccountSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTab?: string
}

export function AccountSettingsModal({ open, onOpenChange, defaultTab = "account" }: AccountSettingsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings
          </DialogTitle>
        </DialogHeader>

        <div className="h-[calc(90vh-80px)]">
          <Tabs defaultValue={defaultTab} className="h-full">
            <TabsList className="mx-6 mt-4 grid w-fit grid-cols-4">
              <TabsTrigger value="account" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Account
              </TabsTrigger>
              <TabsTrigger value="ghl" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                GHL
              </TabsTrigger>
              <TabsTrigger value="meta-ads" className="flex items-center gap-2">
                <Rocket className="h-4 w-4" />
                Meta Ads
              </TabsTrigger>
              <TabsTrigger value="team" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Team
              </TabsTrigger>
            </TabsList>

            {/* Account Settings Tab */}
            <TabsContent value="account" className="h-[calc(100%-60px)] px-6 pb-6 overflow-y-auto">
              <div className="py-4">
                <p className="text-muted-foreground">Account settings content will go here</p>
              </div>
            </TabsContent>

            {/* GHL Connection Tab */}
            <TabsContent value="ghl" className="h-[calc(100%-60px)] px-6 pb-6 overflow-y-auto">
              <div className="py-4">
                <p className="text-muted-foreground">GHL connection content will go here</p>
              </div>
            </TabsContent>

            {/* Meta Ads Connection Tab */}
            <TabsContent value="meta-ads" className="h-[calc(100%-60px)] px-6 pb-6 overflow-y-auto">
              <div className="py-4">
                <p className="text-muted-foreground">Meta Ads connection content will go here</p>
              </div>
            </TabsContent>

            {/* Team Tab */}
            <TabsContent value="team" className="h-[calc(100%-60px)] px-6 pb-6 overflow-y-auto">
              <div className="py-4">
                <p className="text-muted-foreground">Team management content will go here</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}

