import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/database.types'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const accountId = url.searchParams.get('accountId')
    
    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
    }

    // Get views for the account that the user has access to
    const { data: views, error } = await supabase
      .from('dashboard_views')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching views:', error)
      return NextResponse.json({ error: 'Failed to fetch views' }, { status: 500 })
    }

    // Transform database format to frontend format
    const transformedViews = views.map(view => ({
      id: view.id,
      name: view.name,
      description: view.notes || undefined,
      accountId: view.account_id,
      createdBy: view.created_by,
      scope: view.scope as 'private' | 'team' | 'global',
      isPrivate: view.scope === 'private',
      notes: view.notes || undefined,
      filters: view.filters || {},
      widgets: view.widgets || [],
      compareMode: view.compare_mode || false,
      compareEntities: view.compare_entities || [],
      isDefault: view.is_default || false,
      createdAt: view.created_at,
      updatedAt: view.updated_at
    }))

    return NextResponse.json({ views: transformedViews })

  } catch (error) {
    console.error('Views API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, accountId, scope, filters, widgets, compareMode, compareEntities, isDefault } = body

    if (!name || !accountId) {
      return NextResponse.json({ error: 'name and accountId are required' }, { status: 400 })
    }

    // Create the view in Supabase
    const { data: view, error } = await supabase
      .from('dashboard_views')
      .insert({
        name,
        account_id: accountId,
        created_by: user.id,
        scope: scope || 'private',
        notes: description || null,
        filters: filters || {},
        widgets: widgets || [],
        compare_mode: compareMode || false,
        compare_entities: compareEntities || [],
        is_default: isDefault || false
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating view:', error)
      return NextResponse.json({ error: 'Failed to create view' }, { status: 500 })
    }

    // Transform to frontend format
    const transformedView = {
      id: view.id,
      name: view.name,
      description: view.notes || undefined,
      accountId: view.account_id,
      createdBy: view.created_by,
      scope: view.scope as 'private' | 'team' | 'global',
      isPrivate: view.scope === 'private',
      notes: view.notes || undefined,
      filters: view.filters || {},
      widgets: view.widgets || [],
      compareMode: view.compare_mode || false,
      compareEntities: view.compare_entities || [],
      isDefault: view.is_default || false,
      createdAt: view.created_at,
      updatedAt: view.updated_at
    }

    return NextResponse.json({ view: transformedView })

  } catch (error) {
    console.error('Create view API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    // Transform frontend format to database format
    const dbUpdates: any = {}
    if (updates.name !== undefined) dbUpdates.name = updates.name
    if (updates.description !== undefined) dbUpdates.notes = updates.description
    if (updates.scope !== undefined) dbUpdates.scope = updates.scope
    if (updates.filters !== undefined) dbUpdates.filters = updates.filters
    if (updates.widgets !== undefined) {
      // Handle the ViewData format properly - the widgets field should contain the full ViewData object
      dbUpdates.widgets = updates.widgets
    }
    if (updates.compareMode !== undefined) dbUpdates.compare_mode = updates.compareMode
    if (updates.compareEntities !== undefined) dbUpdates.compare_entities = updates.compareEntities
    if (updates.isDefault !== undefined) dbUpdates.is_default = updates.isDefault
    
    dbUpdates.updated_at = new Date().toISOString()

    console.log('🔍 [Views API] Updating view with data:', { id, dbUpdates })

    // Update the view in Supabase
    const { data: view, error } = await supabase
      .from('dashboard_views')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('❌ [Views API] Error updating view:', error)
      return NextResponse.json({ error: 'Failed to update view', details: error.message }, { status: 500 })
    }

    console.log('✅ [Views API] Successfully updated view')

    // Transform to frontend format
    const transformedView = {
      id: view.id,
      name: view.name,
      description: view.notes || undefined,
      accountId: view.account_id,
      createdBy: view.created_by,
      scope: view.scope as 'private' | 'team' | 'global',
      isPrivate: view.scope === 'private',
      notes: view.notes || undefined,
      filters: view.filters || {},
      widgets: view.widgets || [],
      compareMode: view.compare_mode || false,
      compareEntities: view.compare_entities || [],
      isDefault: view.is_default || false,
      createdAt: view.created_at,
      updatedAt: view.updated_at
    }

    return NextResponse.json({ view: transformedView })

  } catch (error) {
    console.error('❌ [Views API] Update view API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    // Delete the view from Supabase
    const { error } = await supabase
      .from('dashboard_views')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting view:', error)
      return NextResponse.json({ error: 'Failed to delete view' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete view API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 