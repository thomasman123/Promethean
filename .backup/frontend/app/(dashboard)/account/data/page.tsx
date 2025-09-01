"use client"

import React from "react"
import { SidebarInset } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabase"

interface TeamMember {
	user_id: string
	full_name: string | null
	email: string | null
	role: 'admin' | 'moderator' | 'sales_rep' | 'setter'
	is_active: boolean
}

export default function AccountDataPage() {
	const { user, loading, selectedAccountId, getAccountBasedPermissions, getSelectedAccount } = useAuth()
	const permissions = getAccountBasedPermissions()
	const selectedAccount = getSelectedAccount()

	// Use a locally any-typed client to avoid deep generic instantiation for count queries
	const sb: any = supabase as any

	const [role, setRole] = React.useState<'setter' | 'sales_rep'>('setter')
	const [members, setMembers] = React.useState<TeamMember[]>([])
	const [memberId, setMemberId] = React.useState<string>("")
	const [tz, setTz] = React.useState<string>('UTC')

	const [apptTotal, setApptTotal] = React.useState<number>(0)
	const [apptFilled, setApptFilled] = React.useState<number>(0)
	const [apptOverdue, setApptOverdue] = React.useState<number>(0)

	const [discTotal, setDiscTotal] = React.useState<number>(0)
	const [discFilled, setDiscFilled] = React.useState<number>(0)
	const [discOverdue, setDiscOverdue] = React.useState<number>(0)

	const [loadingMetrics, setLoadingMetrics] = React.useState<boolean>(false)
	const [loadingMembers, setLoadingMembers] = React.useState<boolean>(false)

	React.useEffect(() => {
		if (loading) return
		if (!user) return
		if (!permissions.canManageAccount) return
		if (!selectedAccountId) return
		const load = async () => {
			setLoadingMembers(true)
			try {
				// Timezone for overdue calculations
				const { data: acc } = await supabase
					.from('accounts')
					.select('business_timezone')
					.eq('id', selectedAccountId)
					.single()
				setTz(acc?.business_timezone || 'UTC')

				// Team members
				const resp = await fetch(`/api/team?accountId=${selectedAccountId}`)
				const json = await resp.json()
				const team: TeamMember[] = (json.members || [])
					.filter((m: any) => m.is_active)
					.map((m: any) => ({ user_id: m.user_id, full_name: m.full_name, email: m.email, role: m.role, is_active: m.is_active }))
				setMembers(team)
				// Default selection
				const firstSetter = team.find(m => m.role === 'setter')
				const firstRep = team.find(m => m.role === 'sales_rep')
				if (role === 'setter' && firstSetter) setMemberId(firstSetter.user_id)
				if (role === 'sales_rep' && firstRep) setMemberId(firstRep.user_id)
			} finally {
				setLoadingMembers(false)
			}
		}
		load()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [loading, user, permissions.canManageAccount, selectedAccountId])

	const setters = React.useMemo(() => members.filter(m => m.role === 'setter'), [members])
	const reps = React.useMemo(() => members.filter(m => m.role === 'sales_rep'), [members])

	const todayLocal = React.useMemo(() => {
		const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
		const y = parts.find(p => p.type === 'year')?.value || '1970'
		const m = parts.find(p => p.type === 'month')?.value || '01'
		const d = parts.find(p => p.type === 'day')?.value || '01'
		return `${y}-${m}-${d}`
	}, [tz])

	React.useEffect(() => {
		if (!selectedAccountId || !memberId) return
		let cancelled = false
		const loadMetrics = async () => {
			setLoadingMetrics(true)
			try {
				// Appointments metrics
				const apptRoleColumn = role === 'sales_rep' ? 'sales_rep_user_id' : 'setter_user_id'
				const { count: apptTotalCount } = await sb
					.from('appointments')
					.select('id', { count: 'exact', head: true })
					.eq('account_id', selectedAccountId)
					.eq(apptRoleColumn as any, memberId)
				const { count: apptFilledCount } = await sb
					.from('appointments')
					.select('id', { count: 'exact', head: true })
					.eq('account_id', selectedAccountId)
					.eq(apptRoleColumn as any, memberId)
					.eq('data_filled', true)
				const { count: apptOverdueCount } = await sb
					.from('appointments')
					.select('id', { count: 'exact', head: true })
					.eq('account_id', selectedAccountId)
					.eq(apptRoleColumn as any, memberId)
					.eq('data_filled', false)
					.lt('local_date', todayLocal)

				if (!cancelled) {
					setApptTotal(apptTotalCount || 0)
					setApptFilled(apptFilledCount || 0)
					setApptOverdue(apptOverdueCount || 0)
				}

				// Discoveries metrics (owner is setter)
				if (role === 'setter') {
					const { count: discTotalCount } = await sb
						.from('discoveries')
						.select('id', { count: 'exact', head: true })
						.eq('account_id', selectedAccountId)
						.eq('setter_user_id', memberId)
					const { count: discFilledCount } = await sb
						.from('discoveries')
						.select('id', { count: 'exact', head: true })
						.eq('account_id', selectedAccountId)
						.eq('setter_user_id', memberId)
						.eq('data_filled', true)
					const { count: discOverdueCount } = await sb
						.from('discoveries')
						.select('id', { count: 'exact', head: true })
						.eq('account_id', selectedAccountId)
						.eq('setter_user_id', memberId)
						.eq('data_filled', false)
						.lt('local_date', todayLocal)
					if (!cancelled) {
						setDiscTotal(discTotalCount || 0)
						setDiscFilled(discFilledCount || 0)
						setDiscOverdue(discOverdueCount || 0)
					}
				} else {
					if (!cancelled) {
						setDiscTotal(0)
						setDiscFilled(0)
						setDiscOverdue(0)
					}
				}
			} finally {
				if (!cancelled) setLoadingMetrics(false)
			}
		}
		loadMetrics()
		return () => { cancelled = true }
	}, [selectedAccountId, memberId, role, todayLocal])

	if (loading || !user || !permissions.canManageAccount) {
		return (
			<SidebarInset>
				<div className="flex items-center justify-center min-h-96">
					<div className="text-center">
						<h2 className="text-lg font-semibold">Access Denied</h2>
						<p className="text-muted-foreground">You don't have permission to access data quality.</p>
					</div>
				</div>
			</SidebarInset>
		)
	}

	const roleMembers = role === 'setter' ? setters : reps
	const selectedMember = roleMembers.find(m => m.user_id === memberId)
	const apptPercent = apptTotal > 0 ? Math.round((apptFilled / apptTotal) * 100) : 0
	const discPercent = discTotal > 0 ? Math.round((discFilled / discTotal) * 100) : 0

	return (
		<SidebarInset>
			<div className="flex flex-1 flex-col gap-4 p-4">
				<div className="space-y-2">
					<h1 className="text-2xl font-bold">Data Quality</h1>
					<p className="text-muted-foreground">Track data completeness and overdue items for your team.</p>
				</div>

				{selectedAccount && (
					<Card>
						<CardHeader>
							<CardTitle>Filters</CardTitle>
						</CardHeader>
						<CardContent className="grid gap-4 md:grid-cols-3">
							<div className="space-y-1">
								<Label>Role</Label>
								<Select value={role} onValueChange={(v)=>{ setRole(v as any); const list = v === 'setter' ? setters : reps; setMemberId(list[0]?.user_id || '') }}>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Select role" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="setter">Setter</SelectItem>
										<SelectItem value="sales_rep">Sales Rep</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-1 md:col-span-2">
								<Label>{role === 'setter' ? 'Setter' : 'Sales Rep'}</Label>
								<Select value={memberId} onValueChange={setMemberId} disabled={loadingMembers || roleMembers.length === 0}>
									<SelectTrigger className="w-full">
										<SelectValue placeholder={`Select a ${role === 'setter' ? 'setter' : 'sales rep'}`} />
									</SelectTrigger>
									<SelectContent>
										{roleMembers.map(m => (
											<SelectItem key={m.user_id} value={m.user_id}>{m.full_name || m.email || m.user_id}</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</CardContent>
					</Card>
				)}

				<div className="grid gap-4 md:grid-cols-2">
					<Card>
						<CardHeader>
							<CardTitle>Appointments ({role === 'setter' ? 'as Setter' : 'as Sales Rep'})</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<div className="text-sm text-muted-foreground">{selectedMember ? (selectedMember.full_name || selectedMember.email) : 'No user selected'}</div>
							<div className="flex items-center justify-between">
								<span className="text-sm">Filled</span>
								<span className="text-sm font-medium">{apptFilled} / {apptTotal} ({apptPercent}%)</span>
							</div>
							<Progress value={apptPercent} />
							<div className="flex items-center justify-between">
								<span className="text-sm">Overdue (not filled)</span>
								<span className="text-sm font-medium">{apptOverdue}</span>
							</div>
						</CardContent>
					</Card>

					{role === 'setter' && (
						<Card>
							<CardHeader>
								<CardTitle>Discoveries (Setter-owned)</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="flex items-center justify-between">
									<span className="text-sm">Filled</span>
									<span className="text-sm font-medium">{discFilled} / {discTotal} ({discPercent}%)</span>
								</div>
								<Progress value={discPercent} />
								<div className="flex items-center justify-between">
									<span className="text-sm">Overdue (not filled)</span>
									<span className="text-sm font-medium">{discOverdue}</span>
								</div>
							</CardContent>
						</Card>
					)}
				</div>
			</div>
		</SidebarInset>
	)
} 