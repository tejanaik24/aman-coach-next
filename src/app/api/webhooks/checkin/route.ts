import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    await request.json()
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 })
  }
}
