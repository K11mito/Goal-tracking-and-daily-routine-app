import { Goal, ChatMessage, DailyTask, SubTask } from '../types';

interface ChatResponse {
  text?: string;
  functionCalls?: Array<{
    name: string;
    args: Record<string, unknown>;
  }>;
  candidates?: unknown[];
}

// Generate a progressive plan of subtasks for a goal
export const generateGoalPlan = async (goalText: string, category: string): Promise<SubTask[]> => {
  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ goalText, category }),
    });

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
    return [
      { id: crypto.randomUUID(), text: "Break down goal into smaller steps", order: 0, isCompleted: false }
    ];
  }
};

export const generateDailyTasks = async (goals: Goal[]): Promise<DailyTask[]> => {
  // Filter to only incomplete goals that have subtasks
  const incompleteGoals = goals.filter(g => !g.isCompleted && g.subtasks && g.subtasks.length > 0);

  if (incompleteGoals.length === 0) return [];

  // For each goal, get the next incomplete subtask
  const dailyTasks: DailyTask[] = [];

  for (const goal of incompleteGoals) {
    // Find the first incomplete subtask
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
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: currentMessage,
        history,
        goals,
        currentTasks,
      }),
    });

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
