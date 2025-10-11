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

    // Get the board
    const { data: board, error: boardError } = await supabase
      .from('canvas_boards')
      .select('*')
      .eq('id', boardId)
      .single()

    if (boardError || !board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 })
    }

    // Check if board is publicly accessible
    if (board.sharing_mode !== 'public') {
      return NextResponse.json({ error: 'Board is not public' }, { status: 403 })
    }

    // Get all elements for this board
    const { data: elements, error: elementsError } = await supabase
      .from('canvas_elements')
      .select('*')
      .eq('board_id', boardId)
      .order('z_index', { ascending: true })

    if (elementsError) {
      return NextResponse.json({ error: 'Failed to load elements' }, { status: 500 })
    }

    return NextResponse.json({
      board: {
        id: board.id,
        name: board.name,
        icon: board.icon,
      },
      elements: elements || [],
    })
  } catch (error: any) {
    console.error('Error fetching public board:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

