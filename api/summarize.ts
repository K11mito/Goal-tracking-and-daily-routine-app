import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { checkRateLimit, getClientIP } from './_rateLimit';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check for user-provided API key (BYOK) — header or body (sendBeacon fallback)
  const userApiKey = (req.headers['x-user-api-key'] as string | undefined) || req.body?.userApiKey;
  const apiKey = userApiKey || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  // Only rate limit if using server key
  if (!userApiKey) {
    const ip = getClientIP(req);
    const { allowed } = checkRateLimit(ip, '/api/summarize');
    if (!allowed) {
      return res.status(429).json({ error: 'Rate limit exceeded. Add your own API key in settings for unlimited usage.' });
    }
  }

  const { messages, existingMemory } = req.body as {
    messages: ChatMessage[];
    existingMemory?: string;
  };

  if (!messages || messages.length < 2) {
    return res.status(400).json({ error: 'Not enough messages to summarize' });
  }

  const openai = new OpenAI({ apiKey });

  const conversationText = messages
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
    .join('\n');

  const prompt = `You are a memory system for a productivity app. Analyze this conversation and extract key information worth remembering for future sessions.

${existingMemory ? `EXISTING MEMORY (incorporate and update, don't duplicate):\n${existingMemory}\n\n` : ''}NEW CONVERSATION:\n${conversationText}

Extract and return a concise summary (max 1500 chars) of:
- User preferences and habits mentioned
- Important decisions or plans made
- Personal context shared (work, schedule, interests)
- Any corrections or updates to previous information

Format as a brief, factual paragraph. If the conversation is just small talk with no useful context, return the existing memory unchanged or "No significant context." Do NOT include conversation structure or timestamps.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    });

    const summary = response.choices[0]?.message?.content || '';

    // Cap at ~2000 chars
    const trimmed = summary.length > 2000 ? summary.substring(0, 2000) : summary;

    return res.status(200).json({ summary: trimmed });
  } catch (error) {
    console.error("Summarize error:", error);
    return res.status(500).json({ error: 'Summarization failed' });
  }
}
