import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { boardId, name } = body

    if (!boardId) {
      return NextResponse.json(
        { error: 'Board ID is required' },
        { status: 400 }
      )
    }

    // Get the highest order number for pages in this board
    const { data: existingPages } = await supabase
      .from('playground_pages')
      .select('order')
      .eq('board_id', boardId)
      .order('order', { ascending: false })
      .limit(1)

    const nextOrder = existingPages && existingPages.length > 0 
      ? existingPages[0].order + 1 
      : 0

    // Create new page
    const { data: newPage, error: createError } = await supabase
      .from('playground_pages')
      .insert({
        board_id: boardId,
        name: name || 'Untitled Page',
        order: nextOrder
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating page:', createError)
      return NextResponse.json(
        { error: 'Failed to create page' },
        { status: 500 }
      )
    }

    // Create empty content for the page
    const { error: contentError } = await supabase
      .from('playground_page_content')
      .insert({
        page_id: newPage.id,
        content: { tldrawDocument: {}, widgets: [] }
      })

    if (contentError) {
      console.error('Error creating page content:', contentError)
    }

    return NextResponse.json({ page: newPage })

  } catch (error) {
    console.error('Error in create page API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { pageId, name, order } = body

    if (!pageId) {
      return NextResponse.json(
        { error: 'Page ID is required' },
        { status: 400 }
      )
    }

    const updates: any = {}
    if (name !== undefined) updates.name = name
    if (order !== undefined) updates.order = order

    const { data: updatedPage, error: updateError } = await supabase
      .from('playground_pages')
      .update(updates)
      .eq('id', pageId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating page:', updateError)
      return NextResponse.json(
        { error: 'Failed to update page' },
        { status: 500 }
      )
    }

    return NextResponse.json({ page: updatedPage })

  } catch (error) {
    console.error('Error in update page API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const pageId = searchParams.get('pageId')

    if (!pageId) {
      return NextResponse.json(
        { error: 'Page ID is required' },
        { status: 400 }
      )
    }

    // Delete page (content will be deleted via CASCADE)
    const { error: deleteError } = await supabase
      .from('playground_pages')
      .delete()
      .eq('id', pageId)

    if (deleteError) {
      console.error('Error deleting page:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete page' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error in delete page API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

