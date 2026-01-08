import { GoogleGenAI, Type, FunctionDeclaration, GenerateContentResponse } from "@google/genai";
import { Goal, ChatMessage, DailyTask } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API Key not found in environment variables");
    return null;
  }
  return new GoogleGenAI({ apiKey: apiKey });
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
  const ai = getClient();
  
  if (!ai) {
    return [
      { id: 'error-1', text: "API Key Missing", isCompleted: false }
    ];
  }
  
  if (goals.length === 0) return [];

  const goalsDescription = goals
    .map(g => `ID: "${g.id}" | Goal: [${g.category}] ${g.text} (Importance: ${g.importance}/10)`)
    .join('\n');

  const prompt = `
    You are an expert productivity coach. Here are my current goals:
    ${goalsDescription}

    Generate a list of 3 to 6 concrete, actionable daily tasks I can do TODAY.
    CRITICAL: You MUST associate each task with the specific "ID" of the goal it helps achieve.
    Return ONLY a valid JSON array.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              associatedGoalId: { type: Type.STRING }
            },
            required: ["text", "associatedGoalId"]
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) return [];
    
    const parsed = JSON.parse(jsonText);
    
    return parsed.map((item: any) => ({
      id: crypto.randomUUID(),
      text: item.text,
      isCompleted: false,
      associatedGoalId: item.associatedGoalId
    }));

  } catch (error) {
    console.error("Error generating tasks:", error);
    return [];
  }
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