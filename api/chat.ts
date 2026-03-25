import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { checkRateLimit, getClientIP } from './_rateLimit';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

interface Goal {
  id: string;
  text: string;
  category: string;
}

interface DailyTask {
  id: string;
  text: string;
  isCompleted: boolean;
}

const managePlanTool: OpenAI.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'manage_daily_plan',
    description: 'Add, remove, or update daily tasks in the user\'s plan. Use this when the user explicitly asks to modify their list.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['add', 'remove', 'update'],
          description: 'The action to perform on the task list.'
        },
        taskText: {
          type: 'string',
          description: 'The content of the task (required for add/update).'
        },
        taskId: {
          type: 'string',
          description: 'The ID of the task (required for remove/update). You MUST get this from the context provided.'
        }
      },
      required: ['action']
    }
  }
};

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
    const { allowed } = checkRateLimit(ip, '/api/chat');
    if (!allowed) {
      return res.status(429).json({ error: 'Rate limit exceeded. Add your own API key in settings for unlimited usage.' });
    }
  }

  const { message, history, goals, currentTasks, memory } = req.body as {
    message: string;
    history: ChatMessage[];
    goals: Goal[];
    currentTasks: DailyTask[];
    memory?: string;
  };

  if (!message) {
    return res.status(400).json({ error: 'Missing message' });
  }

  const openai = new OpenAI({ apiKey });

  const goalsContext = goals && goals.length > 0
    ? `Goals:\n${goals.map(g => `- ${g.text} (${g.category})`).join('\n')}`
    : "No goals set.";

  const tasksContext = currentTasks && currentTasks.length > 0
    ? `Current Daily Tasks:\n${currentTasks.map(t => `- [${t.isCompleted ? 'X' : ' '}] ${t.text} (ID: ${t.id})`).join('\n')}`
    : "No daily tasks yet.";

  const memoryContext = memory
    ? `\n\nMemory from previous sessions (use this to personalize your responses):\n${memory}`
    : '';

  const systemInstruction = `
    You are a goal-oriented assistant.
    Context:
    ${goalsContext}
    ${tasksContext}${memoryContext}

    If the user asks to add, change, or remove a task, CALL THE "manage_daily_plan" TOOL.
    When removing or updating, you MUST use the exact 'ID' listed in the context above.
    Otherwise, respond conversationally.
  `;

  // Map history: Gemini uses 'model', OpenAI uses 'assistant'
  const openaiHistory: OpenAI.ChatCompletionMessageParam[] = (history || []).map(h => ({
    role: h.role === 'model' ? 'assistant' as const : 'user' as const,
    content: h.text,
  }));

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemInstruction },
        ...openaiHistory,
        { role: 'user', content: message },
      ],
      tools: [managePlanTool],
    });

    const choice = response.choices[0]?.message;

    // Convert OpenAI response to match the existing frontend format
    const serializedResponse: {
      text?: string;
      functionCalls?: Array<{ name: string; args: Record<string, unknown> }>;
    } = {};

    if (choice?.tool_calls && choice.tool_calls.length > 0) {
      serializedResponse.functionCalls = choice.tool_calls
        .filter((tc): tc is OpenAI.ChatCompletionMessageToolCall & { type: 'function' } => tc.type === 'function')
        .map(tc => ({
          name: tc.function.name,
          args: JSON.parse(tc.function.arguments),
        }));
    }

    if (choice?.content) {
      serializedResponse.text = choice.content;
    }

    return res.status(200).json({ response: serializedResponse });
  } catch (error) {
    console.error("Chat error:", error);
    return res.status(500).json({ error: 'Chat request failed' });
  }
}
