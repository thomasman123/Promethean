import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import type { Database } from "@/lib/database.types"

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {},
          remove() {},
        },
      }
    )

    // Get the current user
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Fetch user's layout preference
    const { data: userData, error } = await supabase
      .from("users")
      .select("layout_preference")
      .eq("id", user.id)
      .single()

    if (error) {
      console.error("Error fetching layout preference:", error)
      return NextResponse.json(
        { layoutPreference: "classic" },
        { status: 200 }
      )
    }

    return NextResponse.json({
      layoutPreference: userData?.layout_preference || "classic",
    })
  } catch (error) {
    console.error("Error in layout preference GET:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {},
          remove() {},
        },
      }
    )

    // Get the current user
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    if (userData?.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can change layout preference" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { layoutPreference } = body

    if (!["classic", "modern"].includes(layoutPreference)) {
      return NextResponse.json(
        { error: "Invalid layout preference" },
        { status: 400 }
      )
    }

    // Update user's layout preference
    const { error } = await supabase
      .from("users")
      .update({ layout_preference: layoutPreference })
      .eq("id", user.id)

    if (error) {
      console.error("Error updating layout preference:", error)
      return NextResponse.json(
        { error: "Failed to update layout preference" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      layoutPreference,
    })
  } catch (error) {
    console.error("Error in layout preference POST:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

