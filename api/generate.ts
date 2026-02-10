import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from "@google/genai";

interface SubTask {
  id: string;
  text: string;
  order: number;
  isCompleted: boolean;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const { goalText, category } = req.body;

  if (!goalText || !category) {
    return res.status(400).json({ error: 'Missing goalText or category' });
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    You are an expert productivity coach. Break down this goal into a progressive, sequential plan of 5-8 actionable subtasks.

    Goal: ${goalText}
    Category: ${category}

    RULES:
    - Each subtask should logically follow from the previous one
    - Start with foundational/preparatory tasks and progress toward completion
    - Make tasks specific and actionable (avoid vague tasks like "work on it")
    - Tasks should be completable in 1-2 hours each
    - The final task should represent goal completion

    Return ONLY a valid JSON array of subtask strings in order.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) {
      return res.status(200).json({ subtasks: [] });
    }

    const parsed: string[] = JSON.parse(jsonText);

    const subtasks: SubTask[] = parsed.map((text, index) => ({
      id: crypto.randomUUID(),
      text,
      order: index,
      isCompleted: false
    }));

    return res.status(200).json({ subtasks });
  } catch (error) {
    console.error("Error generating goal plan:", error);
    return res.status(200).json({
      subtasks: [
        { id: crypto.randomUUID(), text: "Start working on your goal", order: 0, isCompleted: false }
      ]
    });
  }
}
