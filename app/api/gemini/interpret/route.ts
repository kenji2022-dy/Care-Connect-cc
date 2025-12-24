import type { NextRequest } from "next/server"

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const text: string = body?.text || ""
    const language: "hi" | "te" | "en" = body?.language || "hi"

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    const prompt = {
      contents: [
        {
          parts: [
            {
              text:
                "You are assisting citizens who may not be literate. " +
                "Analyze the following notice board or government circular text. Do the following:\n\n" +
                "1. Simplify the meaning into easy everyday language.\n" +
                `2. Translate into ${language} if needed.\n` +
                "3. Return ONLY the plain text explanation, nothing else. Keep sentences short and clear.\n\n" +
                `Notice text: ${text}`,
            },
          ],
        },
      ],
    }

    const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prompt),
    })

    const json = await res.json()
    const resultText =
      json?.candidates?.[0]?.content?.parts?.[0]?.text || "Error: Could not get a valid response from Gemini API."

    // Language script warnings
    let langWarning: string | null = null
    if (language === "hi") {
      const hasDevanagari = [...resultText].some((c) => c >= "\u0900" && c <= "\u097F")
      if (!hasDevanagari) langWarning = "Warning: Gemini response may not be in Hindi script."
    } else if (language === "te") {
      const hasTelugu = [...resultText].some((c) => c >= "\u0C00" && c <= "\u0C7F")
      if (!hasTelugu) langWarning = "Warning: Gemini response may not be in Telugu script."
    }

    return new Response(JSON.stringify({ text: resultText, langWarning }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (e: any) {
    console.error("[v0] /api/gemini/interpret error:", e?.message || e)
    return new Response(JSON.stringify({ error: "Server error." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
