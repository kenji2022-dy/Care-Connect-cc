import { NextRequest, NextResponse } from "next/server"

let records: any[] = []

export async function GET() {
  console.log(records);
  return NextResponse.json({ records })
}

export async function POST(req: NextRequest) {
  const diagnosis = await req.json()
  const record = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    diagnosis,
  }
  records.unshift(record)
  console.log(records)
  return NextResponse.json({ success: true, record })
} 