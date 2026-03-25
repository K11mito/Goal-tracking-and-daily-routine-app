import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { checkRateLimit, getClientIP } from './_rateLimit';

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

  // Check for user-provided API key (BYOK)
  const userApiKey = req.headers['x-user-api-key'] as string | undefined;
  const apiKey = userApiKey || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  // Only rate limit if using server key
  if (!userApiKey) {
    const ip = getClientIP(req);
    const { allowed } = checkRateLimit(ip, '/api/generate');
    if (!allowed) {
      return res.status(429).json({ error: 'Rate limit exceeded. Add your own API key in settings for unlimited usage.' });
    }
  }

  const { goalText, category } = req.body;

  if (!goalText || !category) {
    return res.status(400).json({ error: 'Missing goalText or category' });
  }

  const openai = new OpenAI({ apiKey });

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

    Return ONLY a valid JSON object with a "subtasks" key containing an array of strings.
    Example: { "subtasks": ["Step 1", "Step 2", "Step 3"] }
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const jsonText = response.choices[0]?.message?.content;
    if (!jsonText) {
      return res.status(200).json({ subtasks: [] });
    }

    const parsed = JSON.parse(jsonText);
    const items: string[] = Array.isArray(parsed.subtasks) ? parsed.subtasks : [];

    const subtasks: SubTask[] = items.map((text: string, index: number) => ({
      id: crypto.randomUUID(),
      text,
      order: index,
      isCompleted: false
    }));

    return res.status(200).json({ subtasks });
  } catch (error) {
    console.error("Error generating goal plan:", error);
    return res.status(500).json({ error: 'Failed to generate goal plan' });
  }
}
