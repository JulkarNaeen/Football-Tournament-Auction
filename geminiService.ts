
import { GoogleGenAI, Type } from "@google/genai";
import { Player, SkillStats, Match } from "../types";

// Always use the API_KEY environment variable directly as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getRecommendedBasePrice = async (stats: SkillStats): Promise<number> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Evaluate a sports player with these skills (0-100 scale): Speed: ${stats.speed}, Power: ${stats.power}, Stamina: ${stats.stamina}. 
      Recommend a realistic corporate auction base price in BDT (Bangladeshi Taka) between 500 and 20000. Return only the number.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendedPrice: { type: Type.NUMBER }
          }
        }
      }
    });
    
    // Accessing .text property directly as it is a getter
    const result = JSON.parse(response.text || '{"recommendedPrice": 1000}');
    return result.recommendedPrice;
  } catch (error) {
    console.error("AI Valuation Error:", error);
    return 1000;
  }
};

export const detectSchedulingConflicts = async (matches: Match[]): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Identify potential scheduling conflicts or physical fatigue risks in these matches: ${JSON.stringify(matches)}. 
      Return a list of specific warning messages.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    
    // Accessing .text property directly as it is a getter
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("AI Conflict Detection Error:", error);
    return [];
  }
};
