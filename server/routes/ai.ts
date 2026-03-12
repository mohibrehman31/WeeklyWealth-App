import { Router } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { CATEGORIES } from '../../shared/constants';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const aiRouter = Router();

aiRouter.post('/categorize', async (req, res) => {
  const { description } = req.body;
  if (!description) return res.status(400).json({ error: 'Description required' });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Categorize this bank transaction: "${description}". Valid categories: ${CATEGORIES.join(', ')}. Return ONLY the category name. If unsure, return "Other".`,
    });
    const category = response.text?.trim() || 'Other';
    res.json({ category: CATEGORIES.includes(category as any) ? category : 'Other' });
  } catch (e) {
    console.error('AI categorize failed', e);
    res.status(500).json({ error: 'AI categorization failed', category: 'Other' });
  }
});

aiRouter.post('/recipe-from-url', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Extract recipe details from this URL: ${url}. Return the recipe name and a list of ingredients with amounts and units.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recipe_name: { type: Type.STRING },
            ingredients: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  amount: { type: Type.STRING },
                  unit: { type: Type.STRING },
                },
                required: ['name', 'amount', 'unit'],
              },
            },
          },
          required: ['recipe_name', 'ingredients'],
        },
      },
    });
    const data = JSON.parse(response.text || '{}');
    res.json(data);
  } catch (e) {
    console.error('AI recipe extraction failed', e);
    res.status(500).json({ error: 'Failed to extract recipe' });
  }
});

aiRouter.post('/meal-ideas', async (req, res) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: 'Generate 5 healthy dinner ideas for a family. Return the recipe names and a brief description for each.',
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
            },
            required: ['name', 'description'],
          },
        },
      },
    });
    const data = JSON.parse(response.text || '[]');
    res.json(data);
  } catch (e) {
    console.error('AI meal ideas failed', e);
    res.status(500).json({ error: 'Failed to generate ideas', data: [] });
  }
});

aiRouter.post('/savings-tips', async (req, res) => {
  const { weeklyIncome, budgetSummary } = req.body;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `As a financial advisor, give 3 short, actionable savings tips for a family with a weekly income of $${weeklyIncome} and the following weekly budget: ${budgetSummary}. Format as a simple list of 3 items.`,
    });
    const text = response.text || '';
    const tips = text.split('\n').filter((t: string) => t.trim().length > 0).slice(0, 3);
    res.json({ tips });
  } catch (e) {
    console.error('AI savings tips failed', e);
    res.status(500).json({ error: 'Failed to generate tips', tips: [] });
  }
});
