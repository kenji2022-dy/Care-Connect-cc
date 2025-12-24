import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Check if the request is multipart (image upload)
  const contentType = req.headers.get("content-type") || "";
    const { symptoms, additionalInfo, location, prompt: customPrompt } = await req.json();
    // Enhanced prompt for AI
    const enhancedPrompt =`
You are a highly accurate medical assistant. Analyze the following symptoms and provide a structured JSON diagnosis and Indian-style home remedies/cures. Respond with ONLY a valid JSON object, no markdown, no explanation, no extra text, no code block, no comments. The response must start with { and end with }. Your response MUST be a valid JSON object with the following fields:

{
  "condition": string, // Name of the most likely condition
  "confidence": number, // Confidence level (0-100)
  "severity": "mild" | "moderate" | "severe", // Severity of the condition
  "description": string, // Short description of the diagnosis
  "recommendations": string[], // List of Indian-style home remedies and recommendations
  "whenToSeekCare": string[], // List of warning signs for when to seek medical care
  "followUp": {
    "recommended": boolean, // Whether follow-up is recommended
    "timeframe": string, // Suggested timeframe for follow-up
    "reason": string // Reason for follow-up
  },
  "nearbyFacilities": [
    {
      "name": string, // Facility name
      "type": "hospital" | "clinic" | "pharmacy", // Type of facility
      "address": string, // Address
      "phone": string, // Phone number
      "mapsLink": string, // Google Maps directions link from the user's location
      "directions": string // Step-by-step driving directions (road to road, turn by turn)
    }
  ],
  "medications": [
    {
      "name": string, // Medication name
      "links": [
        { "provider": string, "url": string } // e.g. Apollo, Amazon, Medlife
      ]
    }
  ],how 
  "doctorVideoScript": string // A positive, doctor-tone script (max 2 min) briefing about the condition, 3 hospitals, 1 pharmacy (with durations), and a few medications
}

Symptoms: ${symptoms}
Additional Info: ${additionalInfo || "None"}
Location: ${location ? JSON.stringify(location) : "Not available"}

Your tasks:\n1. Analyze the symptoms and provide a likely diagnosis, severity, and recommendations.\n2. List at least 3 hospitals, 2 clinics, and 1 pharmacy near the given location. For each, provide: name, address, phone, Google Maps link, and step-by-step directions.\n3. Suggest a list of medications that can be purchased at Apollo Pharmacy or online (Amazon, Medlife, etc.), with direct order links.\n4. Write a positive, doctor-tone script for an AI video (max 2 min) that briefs about the condition, mentions 3 nearby hospitals, 1 pharmacy (with estimated travel durations), and lists a few recommended medications.\n\nRespond ONLY with the JSON object, no extra text or explanation.`;
    const apiKey = process.env.GEMINI_API_KEY;
    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
    const body = {
      contents: [
        {
          parts: [{ text: enhancedPrompt }],
        },
      ],
    };
    try {
      const headers = new Headers();
      headers.set("Content-Type", "application/json");
      if (apiKey) headers.set("x-goog-api-key", apiKey);
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      console.log(response);
      const data = await response.json();
      console.log("DATAA:",data.candidates[0].content.parts[0].text);
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      // Try to parse the JSON from the model's response
      let diagnosis = null;
      try {
        // Find the first JSON object in the text
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          diagnosis = JSON.parse(jsonMatch[0]);
        }
      } catch (err) {
        diagnosis = null;
      }
      if (diagnosis) {
        return NextResponse.json({ diagnosis });
      } else {
        // Fallback: return markdown if present
        return NextResponse.json({ error: "Could not parse diagnosis JSON.", diagnosisMarkdown: text, raw: text }, { status: 200 });
      }
    } catch (error) {
      return NextResponse.json({ error: "Failed to analyze symptoms." }, { status: 500 });
    }
  }
