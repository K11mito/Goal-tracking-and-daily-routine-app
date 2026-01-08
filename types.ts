export enum GoalCategory {
  Academic = 'Academic',
  Personal = 'Personal',
  Business = 'Business',
  Health = 'Health',
}

export interface Goal {
  id: string;
  text: string;
  category: GoalCategory;
  importance: number; // 1 to 10
  dueDate: number; // Timestamp for goal deadline
  createdAt: number;
  totalCompletedTasks: number; // XP System
}

export interface DailyTask {
  id: string;
  text: string;
  isCompleted: boolean;
  associatedGoalId?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}