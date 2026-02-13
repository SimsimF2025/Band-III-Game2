import { GoogleGenAI } from "@google/genai";

// Ensure process.env is available for the SDK
if (typeof window !== 'undefined') {
  (window as any).process = (window as any).process || { env: {} };
}

export async function getVocabHint(word: string, pos: string): Promise<string> {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    console.warn("API_KEY missing. Hints are disabled.");
    return "Complete the match to learn this word!";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide a very short, simple example sentence for the English word "${word}" (part of speech: ${pos}). Keep it under 15 words.`,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text || "Match the terms to learn more.";
  } catch (error) {
    console.error("Gemini Hint Error:", error);
    return "Try matching the terms!";
  }
}