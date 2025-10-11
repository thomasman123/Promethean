import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(
  request: Request,
  { params }: { params: { pageId: string } }
) {
  try {
    const supabase = await createClient()
    const { pageId } = params

    const { data: content, error } = await supabase
      .from('playground_page_content')
      .select('content')
      .eq('page_id', pageId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No content found, return empty
        return NextResponse.json({
          content: { tldrawDocument: {}, widgets: [] }
        })
      }
      console.error('Error fetching content:', error)
      return NextResponse.json(
        { error: 'Failed to fetch content' },
        { status: 500 }
      )
    }

    return NextResponse.json({ content: content.content })

  } catch (error) {
    console.error('Error in get content API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { pageId: string } }
) {
  try {
    const supabase = await createClient()
    const { pageId } = params
    const body = await request.json()
    const { content } = body

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    // Try to update existing content
    const { data: existing } = await supabase
      .from('playground_page_content')
      .select('id')
      .eq('page_id', pageId)
      .single()

    if (existing) {
      // Update existing
      const { error: updateError } = await supabase
        .from('playground_page_content')
        .update({ content })
        .eq('page_id', pageId)

      if (updateError) {
        console.error('Error updating content:', updateError)
        return NextResponse.json(
          { error: 'Failed to update content' },
          { status: 500 }
        )
      }
    } else {
      // Insert new
      const { error: insertError } = await supabase
        .from('playground_page_content')
        .insert({
          page_id: pageId,
          content
        })

      if (insertError) {
        console.error('Error inserting content:', insertError)
        return NextResponse.json(
          { error: 'Failed to save content' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error in save content API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

