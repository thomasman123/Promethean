import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get('impersonate_user_id')?.value || null;
  return NextResponse.json({ impersonatedUserId: cookie });
} 