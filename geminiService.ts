import { GoogleGenAI } from "@google/genai";

export async function getVocabHint(word: string, pos: string): Promise<string> {
  // Safe lookup for API_KEY
  const apiKey = (window as any).process?.env?.API_KEY || (typeof process !== 'undefined' ? process.env.API_KEY : '');
  
  if (!apiKey) {
    console.warn("Gemini API Key is not configured. Hints are disabled.");
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
    return "Keep matching! You are doing great!";
  }
}