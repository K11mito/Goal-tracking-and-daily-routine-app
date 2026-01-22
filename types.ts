export enum GoalCategory {
  Academic = 'Academic',
  Personal = 'Personal',
  Business = 'Business',
  Health = 'Health',
}

// A single subtask in a goal's plan
export interface SubTask {
  id: string;
  text: string;
  order: number;
  isCompleted: boolean;
}

export interface Goal {
  id: string;
  text: string;
  category: GoalCategory;
  importance: number; // 1 to 10
  dueDate: number; // Timestamp for goal deadline
  createdAt: number;
  totalCompletedTasks: number; // XP System
  // Progressive task system
  subtasks: SubTask[];
  isCompleted: boolean;
  currentSubtaskIndex: number; // Index of current active subtask
}

export interface DailyTask {
  id: string;
  text: string;
  isCompleted: boolean;
  associatedGoalId?: string;
  subtaskId?: string; // Link to the specific subtask
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}