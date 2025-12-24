import { NextRequest, NextResponse } from "next/server"

export const runtime = "edge"

const PY_BACKEND_URL = process.env.PY_BACKEND_URL || 'http://localhost:5000';

export async function POST(req: NextRequest) {
  try {
    console.log('[analyze-xray] Incoming request')
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      console.log('[analyze-xray] No file uploaded')
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }
    console.log('[analyze-xray] File received:', file.name)
    // Prepare form data for Flask
    const flaskForm = new FormData()
    flaskForm.append("file", file, file.name)
    console.log('[analyze-xray] Sending to Flask backend:', `${PY_BACKEND_URL}/analyze-xray`)
    // Proxy to Flask backend
    const flaskRes = await fetch(`${PY_BACKEND_URL}/analyze-xray`, {
      method: "POST",
      body: flaskForm,
    })
    console.log('[analyze-xray] Flask response status:', flaskRes.status)
    const data = await flaskRes.json()
    console.log('[analyze-xray] Flask response data:', data)
    return NextResponse.json(data, { status: flaskRes.status })
  } catch (err) {
    console.error('[analyze-xray] Error:', err)
    return NextResponse.json({ error: 'Internal server error', details: String(err) }, { status: 500 })
  }
} 