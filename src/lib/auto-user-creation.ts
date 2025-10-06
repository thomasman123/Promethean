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
		
		console.log(`🔍 Searching for ${role} with email:`, normalized, `in account:`, accountId)
		
		// 1) Try to find existing account access by profile email (case-insensitive)
		const { data: existingAccess, error } = await supabase
			.from('account_access')
			.select('user_id, profiles!inner(id, email, full_name)')
			.eq('account_id', accountId)
			.ilike('profiles.email' as any, normalized)
			.eq('is_active', true)
			.maybeSingle()

		if (error) {
			console.error(`❌ Error searching for ${role}:`, error)
		}

		if (existingAccess?.user_id) {
			console.log(`✅ Found ${role} in account_access:`, {
				userId: existingAccess.user_id,
				email: (existingAccess as any).profiles?.email,
				name: (existingAccess as any).profiles?.full_name
			})
			return existingAccess.user_id as any
		}

		console.log(`❌ No match found for ${role} email:`, normalized)
		return undefined

	}
	
	async function findByName(name: string, role: 'setter' | 'sales_rep' | 'moderator' = 'moderator'): Promise<string | undefined> {
		const normalized = name.trim()
		
		console.log(`🔍 Searching for ${role} with name:`, normalized, `in account:`, accountId)
		
		// Try to find existing account access by profile name (case-insensitive)
		const { data: existingAccess, error } = await supabase
			.from('account_access')
			.select('user_id, profiles!inner(id, email, full_name)')
			.eq('account_id', accountId)
			.ilike('profiles.full_name' as any, normalized)
			.eq('is_active', true)
			.maybeSingle()

		if (error) {
			console.error(`❌ Error searching for ${role} by name:`, error)
		}

		if (existingAccess?.user_id) {
			console.log(`✅ Found ${role} in account_access by name:`, {
				userId: existingAccess.user_id,
				email: (existingAccess as any).profiles?.email,
				name: (existingAccess as any).profiles?.full_name
			})
			return existingAccess.user_id as any
		}

		console.log(`❌ No match found for ${role} name:`, normalized)
		return undefined
	}
	
	try {
		// Process setter - try email first, then fallback to name
		if (setterEmail) {
			const uid = await findOrGrantByEmail(setterEmail, 'setter')
			if (uid) {
				result.setterUserId = uid
				console.log('✅ Linked/granted setter user by email:', setterEmail)
			} else if (setterName) {
				// Fallback to name matching
				const nameUid = await findByName(setterName, 'setter')
				if (nameUid) {
					result.setterUserId = nameUid
					console.log('✅ Linked/granted setter user by name:', setterName)
				} else {
					console.log('⚠️ Setter not found in app users:', setterName || setterEmail)
				}
			}
		} else if (setterName) {
			// No email provided, try name only
			const uid = await findByName(setterName, 'setter')
			if (uid) {
				result.setterUserId = uid
				console.log('✅ Linked/granted setter user by name (no email):', setterName)
			} else {
				console.log('⚠️ Setter not found in app users:', setterName)
			}
		}

		// Process sales rep - try email first, then fallback to name
		if (salesRepEmail) {
			const uid = await findOrGrantByEmail(salesRepEmail, 'sales_rep')
			if (uid) {
				result.salesRepUserId = uid
				console.log('✅ Linked/granted sales rep user by email:', salesRepEmail)
			} else if (salesRepName) {
				// Fallback to name matching
				const nameUid = await findByName(salesRepName, 'sales_rep')
				if (nameUid) {
					result.salesRepUserId = nameUid
					console.log('✅ Linked/granted sales rep user by name:', salesRepName)
				} else {
					console.log('⚠️ Sales rep not found in app users:', salesRepName || salesRepEmail)
				}
			}
		} else if (salesRepName) {
			// No email provided, try name only
			const uid = await findByName(salesRepName, 'sales_rep')
			if (uid) {
				result.salesRepUserId = uid
				console.log('✅ Linked/granted sales rep user by name (no email):', salesRepName)
			} else {
				console.log('⚠️ Sales rep not found in app users:', salesRepName)
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