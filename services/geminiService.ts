import { GoogleGenAI } from "@google/genai";

const getAiClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const fixInvalidJson = async (malformedJson: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const prompt = `
      The following is malformed JSON. Please fix the syntax errors and return ONLY the valid JSON string.
      Do not wrap it in markdown code blocks. Do not add explanations.
      
      Malformed JSON:
      ${malformedJson}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    return response.text?.trim() || "{}";
  } catch (error) {
    console.error("Gemini fix JSON error:", error);
    throw new Error("Failed to repair JSON with AI.");
  }
};

export const generateTypeScriptInterfaces = async (jsonString: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const prompt = `
      Analyze the following JSON object and generate accurate TypeScript interfaces or types to describe it.
      Use 'Root' as the main interface name.
      Return ONLY the TypeScript code. Do not wrap in markdown blocks if possible, or I will strip them.
      
      JSON:
      ${jsonString}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    // Strip markdown code blocks if present
    let text = response.text || "";
    text = text.replace(/^```typescript\s*/, '').replace(/^```ts\s*/, '').replace(/```$/, '');
    return text.trim();
  } catch (error) {
    console.error("Gemini TypeGen error:", error);
    throw new Error("Failed to generate types.");
  }
};