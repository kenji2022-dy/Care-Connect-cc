// app/api/generate-recipes/route.ts
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const { disease, mealType, ingredients, allergies } = await req.json();

    const genAI = new GoogleGenerativeAI("AIzaSyBZtRTyqSWs5SRZD52Er0WRZydTbP0s1ao");
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are a smart AI nutritionist focused on providing culturally relevant, healthy Indian ${mealType} recipes. A user will input a specific health condition, and your job is to recommend **3 structured ${mealType} recipes** that:

1. Are suitable for the specified **health condition** (e.g., diabetes, fever, cough, ${disease}).
2. Follow traditional or modern **Indian cuisine styles**.
3. Include **budget classification**: "Low", "Medium", or "Costly".
4. Provide concise **Health Benefits**, **Ingredients**, and **Step-by-step Instructions**.
5. Use ingredients(have to be in listed ingredients: ${ingredients})) commonly found in Indian kitchens or easily available in Indian markets.(NOte: keep in mind about allergires also, make sure to provide the recipes that do not contain the listed allergies: ${allergies.join(', ')})
6. Are categorized for **${mealType}** only.
7. Output must be structured for rendering in frontend UI.
8. **AVOID chicken-related recipes unless the health condition specifically indicates protein deficiency**.
9. Focus on vegetarian options, lentils, pulses, and Indian spices.
10. Youtube link doesn't need to be an exact video link, it might be an link such that user when clicked sees the respectiev recipe search results(ie. search_query)

Here is the input you will get:
Health Condition: ${disease}
Current Meal Time: ${mealType}
Ingredients: ${ingredients.join(', ')}
Allergies: ${allergies.join(', ')}

---

## 🎯 Output Format Example (Strictly Follow This Format)

\`\`\`json
[
  {
    "name": "Moong Dal Khichdi",
    "budget": "Low",
    "diseaseRelevance": "Moong dal is light, easy to digest, and ideal for managing blood sugar levels. It provides proteins and fiber without spiking insulin.",
    "ingredients": [
      "1/2 cup moong dal (yellow split gram)",
      "1/2 cup rice",
      "1 tsp ghee",
      "1/4 tsp turmeric",
      "Salt to taste",
      "1/2 tsp cumin seeds",
      "1 chopped green chili (optional)",
      "1 tsp grated ginger"
    ],
    "instructions": "1. Wash rice and moong dal together and soak for 15 minutes. 2. Heat ghee in a pressure cooker, add cumin, ginger, chili. 3. Add soaked dal and rice, turmeric, salt, and 2 cups of water. 4. Pressure cook for 2-3 whistles. Serve hot with curd or pickle.",
    "youtubeLink": "https://youtube.com/watch?v=..."
  }
]
\`\`\`

🧠 Additional Tips for LLM Response Quality:
- Prefer traditional healing Indian spices like turmeric, cumin, ginger, garlic, asafoetida, fenugreek
- Avoid high-sugar, high-fat ingredients
- Mention regional names where suitable (e.g., Rasam, Pongal, Tandoori, Upma, Dosa)
- Ensure preparation time is short (under 45 mins ideally)
- Avoid generic recipes like "grilled salmon" unless Indianized (e.g., "Tandoori Salmon")
- Focus on seasonal and locally available ingredients
- Include traditional Indian cooking methods (pressure cooking, slow cooking, tempering)
- Emphasize the therapeutic properties of Indian spices and herbs

Make sure the recipes are practical, healthy, and specifically beneficial for ${disease} patients while being culturally appropriate for Indian cuisine.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Try to extract JSON
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Invalid response format" },
        { status: 500 }
      );
    }

    const recipes = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ recipes });
  } catch (err) {
    console.error("Gemini API error:", err);
    return NextResponse.json({ error: "Failed to generate recipes" }, { status: 500 });
  }
}
