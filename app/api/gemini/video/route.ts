import type { NextRequest } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const text: string = (body?.text || "").toString().trim()

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Use GoogleGenerativeAI SDK similar to app/api/generate-recipes/route.ts
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" })

    const prompt = `You are a strict, factual media-finder assistant with knowledge up to today. For the user's short description below, locate the single BEST public YouTube video that matches the user's intent. Prefer authoritative channels and more recent uploads when relevance is similar. DO NOT hallucinate or invent video IDs or URLs.\n\nREQUIREMENTS (follow exactly):\n1) Return EXACTLY one line containing only a YouTube embed URL in this format: https://www.youtube.com/embed/VIDEO_ID\n2) Do NOT return any other text, punctuation, explanation, or markup — only the single embed URL and a trailing newline.\n3) If you would naturally return a watch URL (https://www.youtube.com/watch?v=VIDEO_ID) or a short URL (https://youtu.be/VIDEO_ID), convert it to the embed format above.\n4) If no exact match exists, return the MOST CLOSELY RELATED existing YouTube video you can find (partial match acceptable). Under NO CIRCUMSTANCE return an empty string, 'none', or explanatory text — you must return one embed URL.\n5) Prefer videos from official, reputable channels when possible. Prefer more recent videos when relevance is similar.\n\nUser input: ${text} with Animation or visuals not humans`

    const result = await model.generateContent(prompt)
    const resultText = (result?.response?.text && result.response.text()) || ""

    // Try to extract YouTube video id from common URL patterns and validate it.
    let embedUrl = ""
    let candidateId: string | null = null
    if (resultText) {
      // prefer to extract a canonical YouTube ID (most are length 11)
      const idMatch =
        resultText.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i) ||
        resultText.match(/^([A-Za-z0-9_-]{6,})$/)

      if (idMatch && idMatch[1]) {
        candidateId = idMatch[1]
        // enforce typical YouTube id length of 11 when possible; accept at least 6 chars
        if (candidateId.length >= 6 && candidateId.length <= 20) {
          // verify the video exists by checking the public thumbnail URL
          try {
            const thumbUrl = `https://img.youtube.com/vi/${candidateId}/hqdefault.jpg`
            const vres = await fetch(thumbUrl, { method: "HEAD" })
            if (vres.ok) {
              embedUrl = `https://www.youtube.com/embed/${candidateId}`
            } else {
              // not found -> treat as invalid
              embedUrl = ""
            }
          } catch (e) {
            // network or fetch issue; be conservative and accept the id if it looks valid
            if (candidateId.length === 11) embedUrl = `https://www.youtube.com/embed/${candidateId}`
          }
        }
      } else if (/^https?:\/\//i.test(resultText)) {
        // If model returned a full URL, attempt to extract an ID first; if not YouTube, check URL validity
        const fullUrl = resultText.trim()
        const extract = fullUrl.match(/(?:v=|\/embed\/|youtu\.be\/)([A-Za-z0-9_-]{6,})/i)
        if (extract && extract[1]) {
          const cid = extract[1]
          try {
            const thumbUrl = `https://img.youtube.com/vi/${cid}/hqdefault.jpg`
            const vres = await fetch(thumbUrl, { method: "HEAD" })
            if (vres.ok) embedUrl = `https://www.youtube.com/embed/${cid}`
          } catch (e) {
            if (cid.length === 11) embedUrl = `https://www.youtube.com/embed/${cid}`
          }
        } else {
          // Non-YouTube URL: attempt a HEAD request and accept if OK (useful for supporting embed-capable URLs)
          try {
            const check = await fetch(fullUrl, { method: "HEAD" })
            if (check.ok) embedUrl = fullUrl
          } catch (e) {
            // failed -> leave embedUrl empty
            embedUrl = ""
          }
        }
      }
    }

    // Fallback strategies: ensure we always return a non-empty link
    if (!embedUrl) {
      // 1) Try YouTube Data API search if a key is available
      const ytApiKey = process.env.YOUTUBE_API_KEY
      if (ytApiKey && text) {
        try {
          const q = encodeURIComponent(text)
          const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${q}&key=${ytApiKey}`
          const sres = await fetch(searchUrl)
          const sj = await sres.json()
          const foundId = sj?.items?.[0]?.id?.videoId
          if (foundId) {
            // validate thumbnail
            try {
              const thumb = `https://img.youtube.com/vi/${foundId}/hqdefault.jpg`
              const vres = await fetch(thumb, { method: "HEAD" })
              if (vres.ok) embedUrl = `https://www.youtube.com/embed/${foundId}`
            } catch (e) {
              embedUrl = `https://www.youtube.com/embed/${foundId}`
            }
          }
        } catch (e) {
          // ignore and continue to other fallbacks
        }
      }

      // 2) Use configured fallback video id if set
      if (!embedUrl) {
        const fallbackId = process.env.FALLBACK_YT_VIDEO_ID
        if (fallbackId && fallbackId.trim()) {
          embedUrl = `https://www.youtube.com/embed/${fallbackId.trim()}`
        }
      }

      // 3) If still empty, accept candidateId even if thumbnail check failed earlier (conservative)
      if (!embedUrl && candidateId) {
        embedUrl = `https://www.youtube.com/embed/${candidateId}`
      }

      // 4) Final hardcoded neutral fallback (only used if nothing else available)
      if (!embedUrl) {
        const finalFallback = process.env.FINAL_FALLBACK_YT_VIDEO_ID || "5qap5aO4i9A"
        embedUrl = `https://www.youtube.com/embed/${finalFallback}`
      }
    }

    return new Response(JSON.stringify({ embedUrl }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (e: any) {
    console.error("/api/gemini/video error:", e?.message || e)
    return new Response(JSON.stringify({ error: "Server error." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
