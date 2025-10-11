import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(
  request: NextRequest,
  { params }: { params: { boardId: string } }
) {
  try {
    const { boardId } = params
    const cookieStore = await cookies()
    const supabase = createServerClient(
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

    const { data: board, error } = await supabase
      .from('canvas_boards')
      .select('*')
      .eq('id', boardId)
      .single()

    if (error) throw error

    return NextResponse.json({ board })
  } catch (error: any) {
    console.error('Error fetching board:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { boardId: string } }
) {
  try {
    const { boardId } = params
    const cookieStore = await cookies()
    const supabase = createServerClient(
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

    // Get the original board
    const { data: originalBoard, error: fetchError } = await supabase
      .from('canvas_boards')
      .select('*')
      .eq('id', boardId)
      .single()

    if (fetchError) throw fetchError

    // Get the highest position for new board
    const { data: maxPosition } = await supabase
      .from('canvas_boards')
      .select('position')
      .eq('account_id', originalBoard.account_id)
      .order('position', { ascending: false })
      .limit(1)
      .single()

    const position = (maxPosition?.position || 0) + 1

    // Create duplicate board
    const { data: newBoard, error: createError } = await supabase
      .from('canvas_boards')
      .insert({
        name: `${originalBoard.name} (Copy)`,
        account_id: originalBoard.account_id,
        created_by: user.id,
        sharing_mode: originalBoard.sharing_mode,
        allowed_users: originalBoard.allowed_users,
        parent_board_id: originalBoard.parent_board_id,
        position,
        icon: originalBoard.icon
      })
      .select()
      .single()

    if (createError) throw createError

    // Get all elements from original board
    const { data: originalElements, error: elementsError } = await supabase
      .from('canvas_elements')
      .select('*')
      .eq('board_id', boardId)

    if (elementsError) throw elementsError

    // Duplicate elements
    if (originalElements && originalElements.length > 0) {
      const newElements = originalElements.map(el => ({
        board_id: newBoard.id,
        type: el.type,
        element_data: el.element_data,
        widget_config: el.widget_config,
        position: el.position,
        size: el.size,
        style: el.style,
        z_index: el.z_index,
        created_by: user.id
      }))

      const { error: insertError } = await supabase
        .from('canvas_elements')
        .insert(newElements)

      if (insertError) throw insertError
    }

    return NextResponse.json({ board: newBoard })
  } catch (error: any) {
    console.error('Error duplicating board:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

