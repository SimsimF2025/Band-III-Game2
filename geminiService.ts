
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getVocabHint(word: string, pos: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide a very short, simple example sentence for the English word "${word}" (part of speech: ${pos}). Keep it under 15 words.`,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text || "No hint available.";
  } catch (error) {
    console.error("Gemini Hint Error:", error);
    return "Try matching the terms!";
  }
}
