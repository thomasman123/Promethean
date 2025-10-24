"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Settings, Building2, Rocket, Users } from "lucide-react"
import { AccountSettingsTab } from "@/components/account/account-settings-tab"
import { TeamTab } from "@/components/account/team-tab"
import { useDashboard } from "@/lib/dashboard-context"
import { useEffectiveUser } from "@/hooks/use-effective-user"
import { supabase } from "@/lib/supabase"
import { Database } from "@/lib/database.types"

interface AccountSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTab?: string
}

export function AccountSettingsModal({ open, onOpenChange, defaultTab = "account" }: AccountSettingsModalProps) {
  const [hasAccess, setHasAccess] = useState(false)
  const { selectedAccountId } = useDashboard()
  const { user: effectiveUser, loading: userLoading } = useEffectiveUser()

  // Check user permissions
  useEffect(() => {
    const checkAccess = async () => {
      if (!effectiveUser || userLoading) return

      try {
        // Check if user is global admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', effectiveUser.id)
          .single()

        if (profile?.role === 'admin') {
          setHasAccess(true)
          return
        }

        // Check if user has account-level moderator access
        if (selectedAccountId) {
          const { data: access } = await supabase
            .from('account_access')
            .select('role')
            .eq('user_id', effectiveUser.id)
            .eq('account_id', selectedAccountId)
            .eq('is_active', true)
            .single()

          setHasAccess(access?.role === 'moderator' || access?.role === 'admin')
        }
      } catch (error) {
        console.error('Error checking access:', error)
        setHasAccess(false)
      }
    }

    if (open) {
      checkAccess()
    }
  }, [effectiveUser, userLoading, selectedAccountId, supabase, open])

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
                <AccountSettingsTab 
                  selectedAccountId={selectedAccountId}
                  hasAccess={hasAccess}
                />
              </div>
            </TabsContent>

            {/* GHL Connection Tab */}
            <TabsContent value="ghl" className="h-[calc(100%-60px)] px-6 pb-6 overflow-y-auto">
              <div className="py-4">
                <Alert>
                  <Building2 className="h-4 w-4" />
                  <AlertTitle>GHL Connection</AlertTitle>
                  <AlertDescription>
                    The GHL connection page remains accessible at{" "}
                    <a href="/account/ghl-connection" className="underline">
                      /account/ghl-connection
                    </a>
                    {" "}for OAuth flows and calendar management.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>

            {/* Meta Ads Connection Tab */}
            <TabsContent value="meta-ads" className="h-[calc(100%-60px)] px-6 pb-6 overflow-y-auto">
              <div className="py-4">
                <Alert>
                  <Rocket className="h-4 w-4" />
                  <AlertTitle>Meta Ads Connection</AlertTitle>
                  <AlertDescription>
                    The Meta Ads connection page remains accessible at{" "}
                    <a href="/account/meta-ads-connection" className="underline">
                      /account/meta-ads-connection
                    </a>
                    {" "}for OAuth flows and ad account management.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>

            {/* Team Tab */}
            <TabsContent value="team" className="h-[calc(100%-60px)] px-6 pb-6 overflow-y-auto">
              <div className="py-4">
                <TeamTab 
                  selectedAccountId={selectedAccountId}
                  hasAccess={hasAccess}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}


