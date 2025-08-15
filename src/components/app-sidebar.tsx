"use client"

import * as React from "react"
import {
	BarChart3,
	Bot,
	Command,
	LifeBuoy,
	MegaphoneIcon,
	Send,
	Settings,
	Shield,
	ClipboardList,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select"
import { useAuth } from "@/hooks/useAuth"

const staticData = {
	navMain: [
		{
			title: "Dashboard",
			url: "/dashboard",
			icon: BarChart3,
			isActive: true,
			items: [
				{ title: "Appointments", url: "/dashboard/appointments" },
				{ title: "Discoveries", url: "/dashboard/discoveries" },
				{ title: "Dials", url: "/dashboard/dials" },
			],
		},
		{ title: "Update Data", url: "/dashboard/update-data", icon: ClipboardList },
		{ title: "Ads", url: "/ads", icon: MegaphoneIcon, items: [ { title: "Setup", url: "/ads/setup" }, { title: "Campaigns", url: "/ads/campaigns" } ] },
		{ title: "AI Tools", url: "/ai-tools", icon: Bot, items: [ { title: "Call Analysis", url: "/ai-tools/call-analysis" }, { title: "KPI Breakdown", url: "/ai-tools/kpi-breakdown" } ] },
		{ title: "Admin", url: "/admin", icon: Shield, items: [ { title: "Manage Accounts", url: "/admin/manage-accounts" } ] },
		{ title: "Account", url: "/account", icon: Settings, items: [ { title: "CRM Connection", url: "/account/crm-connection" }, { title: "Calendar Mapping", url: "/account/calendar-mapping" }, { title: "Source Mapping", url: "/account/source-mapping" }, { title: "Attribution Settings", url: "/account/attribution-settings" }, { title: "Team Members", url: "/account/team-members" } ] },
	],
	navSecondary: [
		{ title: "Support", url: "/support", icon: LifeBuoy },
		{ title: "Feedback", url: "/feedback", icon: Send },
	],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const { user, loading, selectedAccountId, setSelectedAccountId, getAvailableAccounts, isAdmin, isModerator } = useAuth()

	// Snapshot last known values so UI stays stable during transient loading
	const lastUserRef = React.useRef<typeof user>(null)
	const lastAccountsRef = React.useRef(getAvailableAccounts())
	const lastSelectedRef = React.useRef<string | null>(selectedAccountId)
	const lastIsAdminRef = React.useRef<boolean>(false)
	const lastIsModeratorRef = React.useRef<boolean>(false)

	React.useEffect(() => {
		if (user) lastUserRef.current = user
		const accs = getAvailableAccounts()
		if (accs && accs.length) lastAccountsRef.current = accs
		if (selectedAccountId) lastSelectedRef.current = selectedAccountId
		// Compute role flags when not loading
		if (!loading) {
			lastIsAdminRef.current = !!(user && user.profile?.role === 'admin')
			lastIsModeratorRef.current = lastIsAdminRef.current || !!(user && (user.profile?.role === 'moderator'))
		}
	}, [user, loading, selectedAccountId, getAvailableAccounts])

	const effectiveUser = user || lastUserRef.current
	const availableAccounts = getAvailableAccounts()
	const effectiveAccounts = (availableAccounts && availableAccounts.length) ? availableAccounts : lastAccountsRef.current
	const effectiveSelectedId = selectedAccountId || lastSelectedRef.current

	const roleIsAdmin = !loading ? isAdmin() : lastIsAdminRef.current
	const roleIsModerator = !loading ? isModerator() : lastIsModeratorRef.current

	const getFilteredNavItems = () => {
		return staticData.navMain.filter(item => {
			if (item.title === 'Admin') {
				return roleIsAdmin
			}
			if (item.title === 'Account') {
				return roleIsModerator
			}
			if (item.title === 'Ads') {
				return roleIsModerator
			}
			return true
		})
	}

	// If no user at all (first load before auth), render empty shell to keep layout
	if (!effectiveUser) {
		return <Sidebar variant="inset" {...props} />
	}

	const selectedAccount = effectiveAccounts.find(acc => acc.id === effectiveSelectedId) || effectiveAccounts[0]

	const userData = {
		name: effectiveUser.profile?.full_name || effectiveUser.email?.split('@')[0] || 'User',
		email: effectiveUser.email || '',
		avatar: effectiveUser.profile?.avatar_url || '',
	}

	return (
		<Sidebar variant="inset" {...props}>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						{effectiveAccounts.length > 1 ? (
							<Select 
								value={effectiveSelectedId || ''} 
								onValueChange={(value) => setSelectedAccountId(value)}
							>
								<SelectTrigger className="h-auto p-2 border-0 shadow-none bg-transparent hover:bg-transparent focus:bg-transparent data-[state=open]:bg-transparent focus:ring-0 focus:ring-offset-0">
									<div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
										<Command className="size-4" />
									</div>
									<div className="grid flex-1 text-left text-sm leading-tight ml-2">
										<span className="truncate font-medium">{selectedAccount?.name || 'No Account'}</span>
										<span className="truncate text-xs text-muted-foreground">
											{selectedAccount?.description || 'Account'}
										</span>
									</div>
								</SelectTrigger>
								<SelectContent align="center" sideOffset={8}>
									{effectiveAccounts.map((account) => (
										<SelectItem key={account.id} value={account.id}>
											<div className="flex items-center gap-2">
												<div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-6 items-center justify-center rounded-md">
													<Command className="size-3" />
												</div>
												<div className="grid text-left text-sm leading-tight">
													<span className="truncate font-medium">{account.name}</span>
													<span className="truncate text-xs text-muted-foreground">
														{account.description || 'Account'}
													</span>
												</div>
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						) : (
							<div className="flex items-center gap-2 p-2">
								<div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
									<Command className="size-4" />
								</div>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-medium">{selectedAccount?.name || 'No Account'}</span>
									<span className="truncate text-xs text-muted-foreground">
										{selectedAccount?.description || 'Account'}
									</span>
								</div>
							</div>
						)}
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={getFilteredNavItems()} />
				<NavSecondary items={staticData.navSecondary} className="mt-auto" />
			</SidebarContent>
			<SidebarFooter>
				<NavUser user={userData} />
			</SidebarFooter>
		</Sidebar>
	)
}
