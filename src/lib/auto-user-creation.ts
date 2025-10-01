import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Simplified function to link existing app users to appointments
export async function linkExistingUsersToData(
	supabase: ReturnType<typeof createClient<Database>>,
	accountId: string,
	setterName: string | null,
	salesRepName: string | null,
	setterEmail?: string | null,
	salesRepEmail?: string | null
): Promise<{ 
	setterUserId?: string; 
	salesRepUserId?: string;
}> {
	
	const result: { 
		setterUserId?: string; 
		salesRepUserId?: string;
	} = {}
	
	async function findOrGrantByEmail(email: string, role: 'setter' | 'sales_rep' | 'moderator' = 'moderator'): Promise<string | undefined> {
		const normalized = email.trim().toLowerCase()
		// 1) Try to find existing account access by profile email (case-insensitive)
		const { data: existingAccess } = await supabase
			.from('account_access')
			.select('user_id, profiles!inner(id, email)')
			.eq('account_id', accountId)
			.ilike('profiles.email' as any, normalized)
			.eq('is_active', true)
			.maybeSingle()

		if (existingAccess?.user_id) return existingAccess.user_id as any

		return undefined

	}
	
	try {
		// Process setter - link or grant
		if (setterEmail) {
			const uid = await findOrGrantByEmail(setterEmail, 'setter')
			if (uid) {
				result.setterUserId = uid
				console.log('✅ Linked/granted setter user:', setterEmail)
			} else {
				console.log('⚠️ Setter not found in app users:', setterName || setterEmail)
			}
		}

		// Process sales rep - link or grant
		if (salesRepEmail) {
			const uid = await findOrGrantByEmail(salesRepEmail, 'sales_rep')
			if (uid) {
				result.salesRepUserId = uid
				console.log('✅ Linked/granted sales rep user:', salesRepEmail)
			} else {
				console.log('⚠️ Sales rep not found in app users:', salesRepName || salesRepEmail)
			}
		}

		return result
	} catch (error) {
		console.error('Error linking existing users to data:', error)
		return result
	}
}

// Keep the old function name for backward compatibility but mark as deprecated
export async function ensureUsersExistForData(
	supabase: ReturnType<typeof createClient<Database>>,
	accountId: string,
	setterName: string | null,
	salesRepName: string | null,
	ghlApiKey?: string,
	ghlLocationId?: string,
	setterGhlId?: string,
	salesRepGhlId?: string
): Promise<{ 
	setterUserId?: string; 
	salesRepUserId?: string;
	setterGhlId?: string;
	salesRepGhlId?: string;
}> {
	
	console.warn('⚠️ ensureUsersExistForData is deprecated. Use linkExistingUsersToData instead.')
	
	// Get emails for the GHL users
	let setterEmail: string | null = null
	let salesRepEmail: string | null = null
	
	// Try to get setter email
	if (setterGhlId && ghlApiKey) {
		try {
			const response = await fetch(`https://services.leadconnectorhq.com/users/${setterGhlId}`, {
				headers: {
					'Authorization': `Bearer ${ghlApiKey}`,
					'Version': '2021-07-28',
				},
			})
			if (response.ok) {
				const userData = await response.json()
				setterEmail = userData.email
			}
		} catch (error) {
			console.warn('Failed to fetch setter email from GHL:', error)
		}
	}
	
	// Try to get sales rep email
	if (salesRepGhlId && ghlApiKey) {
		try {
			const response = await fetch(`https://services.leadconnectorhq.com/users/${salesRepGhlId}`, {
				headers: {
					'Authorization': `Bearer ${ghlApiKey}`,
					'Version': '2021-07-28',
				},
			})
			if (response.ok) {
				const userData = await response.json()
				salesRepEmail = userData.email
			}
		} catch (error) {
			console.warn('Failed to fetch sales rep email from GHL:', error)
		}
	}
	
	// Use the new simplified function
	const result = await linkExistingUsersToData(
		supabase,
		accountId,
		setterName,
		salesRepName,
		setterEmail,
		salesRepEmail
	)
	
	// Return in the old format with GHL IDs
	return {
		...result,
		setterGhlId,
		salesRepGhlId
	}
} 