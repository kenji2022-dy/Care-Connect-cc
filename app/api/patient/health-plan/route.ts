import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
    const res = await fetch(`${backendUrl}/patient/health-plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Internal error" }, { status: 500 });
  }
} 