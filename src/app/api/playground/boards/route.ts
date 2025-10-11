import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      )
    }

    // Check if board exists for this account
    const { data: existingBoard, error: fetchError } = await supabase
      .from('playground_boards')
      .select(`
        *,
        playground_pages (
          id,
          name,
          order,
          created_at,
          updated_at
        )
      `)
      .eq('account_id', accountId)
      .single()

    if (existingBoard && !fetchError) {
      // Sort pages by order
      const sortedPages = existingBoard.playground_pages?.sort(
        (a: any, b: any) => a.order - b.order
      ) || []
      
      return NextResponse.json({
        board: {
          ...existingBoard,
          pages: sortedPages
        }
      })
    }

    // Create new board with a default page
    const { data: newBoard, error: createBoardError } = await supabase
      .from('playground_boards')
      .insert({
        account_id: accountId,
        name: 'Default Board'
      })
      .select()
      .single()

    if (createBoardError) {
      console.error('Error creating board:', createBoardError)
      return NextResponse.json(
        { error: 'Failed to create board' },
        { status: 500 }
      )
    }

    // Create default page
    const { data: newPage, error: createPageError } = await supabase
      .from('playground_pages')
      .insert({
        board_id: newBoard.id,
        name: 'Untitled Page',
        order: 0
      })
      .select()
      .single()

    if (createPageError) {
      console.error('Error creating default page:', createPageError)
    }

    // Create empty content for the page
    if (newPage) {
      await supabase
        .from('playground_page_content')
        .insert({
          page_id: newPage.id,
          content: { tldrawDocument: {}, widgets: [] }
        })
    }

    return NextResponse.json({
      board: {
        ...newBoard,
        pages: newPage ? [newPage] : []
      }
    })

  } catch (error) {
    console.error('Error in playground boards API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

