import { NextRequest, NextResponse } from "next/server"
import { transcribePrescriptionBase64 } from '../../../lib/visionService'

export const runtime = "edge"

export async function POST(req: NextRequest) {
  try {
    console.log('[transcribe-prescription] Incoming request')
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      console.log('[transcribe-prescription] No file uploaded')
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }
    console.log('[transcribe-prescription] File received:', file.name)

    // Read file to base64
    const arrayBuffer = await file.arrayBuffer()
    let base64: string
    // Prefer Buffer if available (Node), otherwise use btoa (edge)
    if (typeof Buffer !== 'undefined') {
      base64 = Buffer.from(arrayBuffer).toString('base64')
    } else {
      const bytes = new Uint8Array(arrayBuffer)
      let binary = ''
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i])
      }
      base64 = btoa(binary)
    }

    // Call the vision service which returns raw text (we expect a JSON object inside)
    const aiText = await transcribePrescriptionBase64(base64)
    console.log('[transcribe-prescription] AI raw text:', aiText?.slice?.(0, 500))

    // Try to extract JSON object from AI response
    const objMatch = aiText.match(/\{[\s\S]*\}/)
    if (!objMatch) {
      return NextResponse.json({ success: false, error: 'Invalid AI response format', raw: aiText }, { status: 502 })
    }

    let parsed = null
    try {
      parsed = JSON.parse(objMatch[0])
    } catch (e) {
      return NextResponse.json({ success: false, error: 'Failed to parse JSON from AI', raw: aiText }, { status: 502 })
    }

    // Ensure fields per rules
    if (!parsed.disclaimer) {
      parsed.disclaimer = 'This is an AI-generated transcription. Please verify with a medical professional.'
    }

    return NextResponse.json({ success: true, transcription: parsed }, { status: 200 })
  } catch (err) {
    console.error('[transcribe-prescription] Error:', err)
    return NextResponse.json({ error: 'Internal server error', details: String(err) }, { status: 500 })
  }
}
