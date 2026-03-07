import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const generateMealPlan = async (preferences: string, budget: number) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a 7-day meal plan for a family with these preferences: ${preferences}. 
    The total weekly grocery budget is $${budget}. 
    Include breakfast, lunch, and dinner. 
    Format the output as a JSON array of objects with keys: date, meal_type, recipe_name, estimated_cost.`,
    config: {
      responseMimeType: "application/json"
    }
  });
  
  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse meal plan", e);
    return [];
  }
};

export const categorizeTransaction = async (description: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Categorize this bank transaction description: "${description}". 
    Choose from: Housing, Food, Transport, Utilities, Entertainment, Health, Shopping, Other.
    Return only the category name.`,
  });
  
  return response.text?.trim() || "Other";
};
