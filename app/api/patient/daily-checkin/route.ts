import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

type VitalsEntry = {
  date: string
  temperature?: number
  heartRate?: number
  respiratoryRate?: number
  spo2?: number
  weight?: number
  glucose?: number
  pain?: number
  notes?: string
}

function analyze(entries: VitalsEntry[]) {
  if (!entries || entries.length === 0) return { error: 'No data provided' }
  // find today's entry (prefer exact date match)
  const today = new Date().toISOString().slice(0, 10)
  let todayEntry = entries.find(e => e.date === today) || entries[0]

  const unusual: string[] = []
  const suggestions: string[] = []

  // temperature
  if (todayEntry.temperature !== undefined) {
    if (todayEntry.temperature >= 38) {
      unusual.push(`Fever: ${todayEntry.temperature} °C`)
      suggestions.push('Consider antipyretics and monitoring closely; seek urgent care if temperature persists >39°C or other red flags appear.')
    } else if (todayEntry.temperature < 35) {
      unusual.push(`Low body temperature: ${todayEntry.temperature} °C`)
    }
  }

  // SPO2
  if (todayEntry.spo2 !== undefined) {
    if (todayEntry.spo2 < 94) {
      unusual.push(`Low oxygen saturation: ${todayEntry.spo2}%`)
      suggestions.push('Low SpO2 may indicate respiratory compromise; seek medical assessment. If shortness of breath or chest pain present, go to emergency.')
    }
  }

  // Blood pressure removed from flow — no checks performed here

  // Heart rate
  if (todayEntry.heartRate !== undefined) {
    if (todayEntry.heartRate > 120) {
      unusual.push(`Tachycardia: ${todayEntry.heartRate} bpm`)
      suggestions.push('Fast heart rate may need urgent evaluation if associated with dizziness, fainting, or chest pain.')
    } else if (todayEntry.heartRate < 50) {
      unusual.push(`Bradycardia: ${todayEntry.heartRate} bpm`)
    }
  }

  // Glucose
  if (todayEntry.glucose !== undefined) {
    if (todayEntry.glucose >= 250) {
      unusual.push(`High blood glucose: ${todayEntry.glucose} mg/dL`)
      suggestions.push('Marked hyperglycemia — check for symptoms (thirst, polyuria) and contact your provider urgently.')
    } else if (todayEntry.glucose <= 54) {
      unusual.push(`Low blood glucose: ${todayEntry.glucose} mg/dL`)
      suggestions.push('Hypoglycemia — treat with fast-acting carbohydrate and seek care if symptoms persist.')
    }
  }

  // pain
  if (todayEntry.pain !== undefined && todayEntry.pain >= 7) {
    unusual.push(`High pain score: ${todayEntry.pain}/10`)
    suggestions.push('Severe pain — consider urgent evaluation depending on cause and associated signs.')
  }

  // build a natural-language summary (simulated Gemini)
  let summary = `Analysis for ${todayEntry.date}: `
  if (unusual.length === 0) summary += 'All reported vitals are within expected ranges for routine monitoring.'
  else summary += `Found ${unusual.length} notable finding(s): ${unusual.join('; ')}.`

  const suggestionText = suggestions.length > 0 ? suggestions.join('\n') : 'No specific urgent suggestions. Continue routine monitoring and contact your clinician if you feel unwell.'

  // Provide some nearby clinics/hospitals suggestions (maps links use a general near-me search so browser can use location)
  const locations = [
    { name: 'Nearest Clinic', address: 'Search for clinics near you', mapUrl: 'https://www.google.com/maps/search/clinic+near+me' },
    { name: 'Nearby Hospital', address: 'Search for hospitals near you', mapUrl: 'https://www.google.com/maps/search/hospital+near+me' },
    { name: 'Urgent Care', address: 'Search for urgent care near you', mapUrl: 'https://www.google.com/maps/search/urgent+care+near+me' }
  ]

  return {
    summary,
    unusual,
    suggestions: suggestionText,
    locations,
    // include the original entry for client rendering if needed
    todayEntry
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const cookieStorage: VitalsEntry[] = body?.cookieStorage
    const location = body?.location // optional { lat, lon }
    // If we have a Gemini/Google API key available in the server env, call Gemini directly
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || ''
    if (apiKey) {
      try {
        const summary_lines: string[] = []
        for (const e of (cookieStorage || []).slice(0, 7)) {
          summary_lines.push(`Date: ${e.date}, Temp: ${e.temperature}, HR: ${e.heartRate}, SpO2: ${e.spo2}, RR: ${e.respiratoryRate}, Glucose: ${e.glucose}, Pain: ${e.pain}, Notes: ${e.notes}`)
        }

        const prompt = `You are a helpful, evidence-based medical assistant. The user provided recent vitals (up to 7 entries):\n\n${summary_lines.join('\n')}\n\nPlease provide a structured analysis with these sections (in plain text):\n1) Brief summary of the current status (one paragraph).\n2) Any concerning or urgent findings (list). If any finding indicates immediate/emergency care is recommended, write the word EMERGENCY: followed by reasons.\n3) Actionable suggestions for the patient (triage, home care, when to see a clinician).\n4) If emergency is identified, recommend the patient to seek immediate care and include what to look for (red flags). Be concise and patient-friendly.`

        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
        const result = await model.generateContent(prompt as any)
        const geminiText = (result.response?.text?.() ?? result.response?.toString?.() ?? '') as string

        // Basic rule-based emergency detection similar to previous server logic
        let emergency = false
        const todayEntry = (cookieStorage && cookieStorage.length > 0) ? cookieStorage[0] : null
        try {
          if (todayEntry) {
            if ((todayEntry.temperature && todayEntry.temperature >= 39) ||
                (todayEntry.spo2 && todayEntry.spo2 < 92) ||
                (todayEntry.heartRate && todayEntry.heartRate > 130) ||
                (todayEntry.glucose && todayEntry.glucose >= 300) ||
                (todayEntry.pain && todayEntry.pain >= 8)) {
              emergency = true
            }
          }
        } catch (e) {
          // ignore
        }

        // prepare location suggestions
        const locations = [] as any[]
        if (emergency) {
          if (location && location.lat && location.lon) {
            const lat = location.lat
            const lon = location.lon
            locations.push({ name: 'Nearest Hospital', address: 'Nearby hospitals', mapUrl: `https://www.google.com/maps/search/hospital/@${lat},${lon},13z` })
            locations.push({ name: 'Nearest Clinic', address: 'Nearby clinics', mapUrl: `https://www.google.com/maps/search/clinic/@${lat},${lon},13z` })
          } else {
            locations.push({ name: 'Nearest Hospital', address: 'Search hospitals near me', mapUrl: 'https://www.google.com/maps/search/hospital+near+me' })
          }
        }

        return NextResponse.json({ summary: geminiText, unusual: [], suggestions: null, locations, emergency, raw: { gemini: geminiText } })
      } catch (e) {
        console.warn('Gemini call failed:', e)
        // fallthrough to local analyze
      }
    }

    // Fallback: use local rule-based analyzer
    const result = analyze(cookieStorage)
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Unknown error' }, { status: 500 })
  }
}
