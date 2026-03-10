import { Goal, ChatMessage, DailyTask, SubTask } from '../types';

interface ChatResponse {
  text?: string;
  functionCalls?: Array<{
    name: string;
    args: Record<string, unknown>;
  }>;
  candidates?: unknown[];
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const userKey = localStorage.getItem('liquid-user-api-key');
  if (userKey) {
    headers['x-user-api-key'] = userKey;
  }
  return headers;
}

// Generate a progressive plan of subtasks for a goal
export const generateGoalPlan = async (goalText: string, category: string): Promise<SubTask[]> => {
  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ goalText, category }),
    });

    if (response.status === 429) {
      const data = await response.json();
      throw new Error(data.error || 'Rate limit exceeded');
    }

    if (!response.ok) {
      console.error('API error:', response.status);
      return [
        { id: crypto.randomUUID(), text: "Break down goal into smaller steps", order: 0, isCompleted: false }
      ];
    }

    const data = await response.json();
    return data.subtasks || [];
  } catch (error) {
    console.error("Error generating goal plan:", error);
    if (error instanceof Error && error.message.includes('Rate limit')) {
      throw error;
    }
    return [
      { id: crypto.randomUUID(), text: "Break down goal into smaller steps", order: 0, isCompleted: false }
    ];
  }
};

export const generateDailyTasks = async (goals: Goal[]): Promise<DailyTask[]> => {
  const incompleteGoals = goals.filter(g => !g.isCompleted && g.subtasks && g.subtasks.length > 0);

  if (incompleteGoals.length === 0) return [];

  const dailyTasks: DailyTask[] = [];

  for (const goal of incompleteGoals) {
    const nextSubtask = goal.subtasks.find(st => !st.isCompleted);

    if (nextSubtask) {
      dailyTasks.push({
        id: crypto.randomUUID(),
        text: `${nextSubtask.text}`,
        isCompleted: false,
        associatedGoalId: goal.id,
        subtaskId: nextSubtask.id
      });
    }
  }

  return dailyTasks;
};

export const chatWithGoals = async (
  currentMessage: string,
  history: ChatMessage[],
  goals: Goal[],
  currentTasks: DailyTask[]
): Promise<ChatResponse | null> => {
  try {
    // Include stored memory in the request
    const memory = localStorage.getItem('liquid-chat-memory') || undefined;

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        message: currentMessage,
        history,
        goals,
        currentTasks,
        memory,
      }),
    });

    if (response.status === 429) {
      const data = await response.json();
      return { text: data.error || 'Rate limit exceeded. Add your own API key in settings for unlimited usage.' };
    }

    if (!response.ok) {
      console.error('Chat API error:', response.status);
      return null;
    }

    const data = await response.json();
    return data.response || null;
  } catch (error) {
    console.error("Chat error:", error);
    return null;
  }
};

export const summarizeChat = async (
  messages: ChatMessage[]
): Promise<string | null> => {
  try {
    const existingMemory = localStorage.getItem('liquid-chat-memory') || undefined;

    const response = await fetch('/api/summarize', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        messages: messages.map(m => ({ role: m.role, text: m.text })),
        existingMemory,
      }),
    });

    if (!response.ok) {
      console.error('Summarize API error:', response.status);
      return null;
    }

    const data = await response.json();
    return data.summary || null;
  } catch (error) {
    console.error("Summarize error:", error);
    return null;
  }
};
