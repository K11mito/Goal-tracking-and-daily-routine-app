import { GoogleGenAI, Type, FunctionDeclaration, GenerateContentResponse } from "@google/genai";
import { Goal, ChatMessage, DailyTask, SubTask } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API Key not found in environment variables");
    return null;
  }
  return new GoogleGenAI({ apiKey: apiKey });
};

// Generate a progressive plan of subtasks for a goal
export const generateGoalPlan = async (goalText: string, category: string): Promise<SubTask[]> => {
  const ai = getClient();

  if (!ai) {
    return [
      { id: crypto.randomUUID(), text: "Break down goal into smaller steps", order: 0, isCompleted: false }
    ];
  }

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
    if (!jsonText) return [];

    const parsed: string[] = JSON.parse(jsonText);

    return parsed.map((text, index) => ({
      id: crypto.randomUUID(),
      text,
      order: index,
      isCompleted: false
    }));

  } catch (error) {
    console.error("Error generating goal plan:", error);
    return [
      { id: crypto.randomUUID(), text: "Start working on your goal", order: 0, isCompleted: false }
    ];
  }
};

// Define the tool for the chatbot
const managePlanTool: FunctionDeclaration = {
  name: 'manage_daily_plan',
  description: 'Add, remove, or update daily tasks in the user\'s plan. Use this when the user explicitly asks to modify their list.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: {
        type: Type.STRING,
        enum: ['add', 'remove', 'update'],
        description: 'The action to perform on the task list.'
      },
      taskText: {
        type: Type.STRING,
        description: 'The content of the task (required for add/update).'
      },
      taskId: {
        type: Type.STRING,
        description: 'The ID of the task (required for remove/update). You MUST get this from the context provided.'
      }
    },
    required: ['action']
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
      // Calculate progress for display
      const completedCount = goal.subtasks.filter(st => st.isCompleted).length;
      const totalCount = goal.subtasks.length;

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
): Promise<GenerateContentResponse | null> => {
  const ai = getClient();

  if (!ai) return null;

  const goalsContext = goals.length > 0
    ? `Goals:\n${goals.map(g => `- ${g.text} (${g.category})`).join('\n')}`
    : "No goals set.";

  const tasksContext = currentTasks.length > 0
    ? `Current Daily Tasks:\n${currentTasks.map(t => `- [${t.isCompleted ? 'X' : ' '}] ${t.text} (ID: ${t.id})`).join('\n')}`
    : "No daily tasks yet.";

  const systemInstruction = `
    You are a goal-oriented assistant. 
    Context:
    ${goalsContext}
    ${tasksContext}
    
    If the user asks to add, change, or remove a task, CALL THE "manage_daily_plan" TOOL.
    When removing or updating, you MUST use the exact 'ID' listed in the context above.
    Otherwise, respond conversationally.
  `;

  try {
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: systemInstruction,
        tools: [{ functionDeclarations: [managePlanTool] }],
      },
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.text }]
      }))
    });

    const response = await chat.sendMessage({ message: currentMessage });
    return response;
  } catch (error) {
    console.error("Chat error:", error);
    return null;
  }
};