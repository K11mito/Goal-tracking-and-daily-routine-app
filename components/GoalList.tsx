import React, { useState } from 'react';
import { Goal, DailyTask } from '../types';
import GlassCard from './GlassCard';
import { Layers, Trash2, Zap, TrendingUp, Edit2, Clock } from 'lucide-react';

interface GoalListProps {
  goals: Goal[];
  tasks: DailyTask[];
  onRemoveGoal: (id: string) => void;
  onUpdateGoal: (id: string, newText: string) => void;
}

// Calculate days remaining until due date
const getDaysRemaining = (dueDate: number): number => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = due.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

// Get urgency color based on days remaining
const getUrgencyColor = (daysRemaining: number): string => {
  if (daysRemaining <= 0) return 'text-red-500 dark:text-red-400';
  if (daysRemaining <= 3) return 'text-orange-500 dark:text-orange-400';
  if (daysRemaining <= 7) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-sage-500 dark:text-gray-400';
};

const GoalList: React.FC<GoalListProps> = ({ goals, tasks, onRemoveGoal, onUpdateGoal }) => {
  const sortedGoals = [...goals].sort((a, b) => b.importance - a.importance);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const getGoalProgress = (goalId: string) => {
    const goalTasks = tasks.filter(t => t.associatedGoalId === goalId);
    if (goalTasks.length === 0) return 0;
    const completed = goalTasks.filter(t => t.isCompleted).length;
    return Math.round((completed / goalTasks.length) * 100);
  };

  const startEditing = (goal: Goal) => {
    setEditingId(goal.id);
    setEditText(goal.text);
  };

  const saveEdit = (id: string) => {
    if (editText.trim()) {
      onUpdateGoal(id, editText);
    }
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') saveEdit(id);
    if (e.key === 'Escape') setEditingId(null);
  };

  if (goals.length === 0) {
    return (
      <GlassCard className="h-full flex flex-col justify-center items-center text-center p-12" delay="animate-delay-200">
        <div className="h-20 w-20 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mb-6 ring-1 ring-black/10 dark:ring-white/10 animate-pulse-slow">
          <Layers size={32} className="text-sage-500 dark:text-white/40" />
        </div>
        <p className="text-lg font-medium text-sage-600 dark:text-white/50">Initialize Goals.</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard title="Active Targets" icon={<TrendingUp size={18} />} className="h-full" delay="animate-delay-200" noPadding>
      <div className="flex flex-col max-h-[500px] overflow-y-auto custom-scrollbar px-4 pb-4 gap-3">
        {sortedGoals.map((goal, index) => {
          const dailyProgress = getGoalProgress(goal.id);
          const isEditing = editingId === goal.id;
          const daysRemaining = goal.dueDate ? getDaysRemaining(goal.dueDate) : null;
          const urgencyColor = daysRemaining !== null ? getUrgencyColor(daysRemaining) : '';

          return (
            <div
              key={goal.id}
              className="group relative rounded-2xl bg-white/60 dark:bg-[#222] border border-sage-200 dark:border-white/5 p-4 transition-all hover:bg-white dark:hover:bg-[#2a2a2a] hover:border-lime-500/30 shadow-sm hover:shadow-md"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="relative flex justify-between items-start mb-4">
                <div className="space-y-1 flex-1 mr-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-sage-100 dark:bg-white/5 text-[10px] font-bold uppercase tracking-wider text-sage-700 dark:text-lime-200 border border-sage-200 dark:border-white/5">
                      {goal.category}
                    </span>
                    {goal.totalCompletedTasks > 0 && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-lime-600 dark:text-lime-300 drop-shadow-[0_0_8px_rgba(190,242,100,0.5)]">
                        <Zap size={10} fill="currentColor" /> {goal.totalCompletedTasks} XP
                      </span>
                    )}
                    {daysRemaining !== null && (
                      <span className={`flex items-center gap-1 text-[10px] font-bold ${urgencyColor}`}>
                        <Clock size={10} />
                        {daysRemaining <= 0 ? 'Overdue' : daysRemaining === 1 ? '1 day left' : `${daysRemaining} days left`}
                      </span>
                    )}
                  </div>

                  {isEditing ? (
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onBlur={() => saveEdit(goal.id)}
                      onKeyDown={(e) => handleKeyDown(e, goal.id)}
                      autoFocus
                      className="w-full bg-transparent border-b border-lime-500 font-bold text-[17px] text-sage-900 dark:text-white focus:outline-none"
                    />
                  ) : (
                    <div className="group/text relative">
                      <h3
                        onClick={() => startEditing(goal)}
                        className="font-bold text-sage-900 dark:text-white text-[17px] leading-snug pr-2 tracking-tight cursor-text hover:text-lime-700 dark:hover:text-lime-200 transition-colors"
                      >
                        {goal.text}
                        <Edit2 size={12} className="inline ml-2 opacity-0 group-hover/text:opacity-50" />
                      </h3>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => onRemoveGoal(goal.id)}
                  className="p-2 rounded-full text-sage-400 dark:text-white/20 hover:text-red-500 dark:hover:text-red-400 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Goal Progress Bar - based on subtasks */}
              {goal.subtasks && goal.subtasks.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-medium text-sage-500 dark:text-white/40">
                    <span>Goal Progress</span>
                    <span className={goal.isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-lime-700 dark:text-lime-200'}>
                      {goal.isCompleted ? '✓ Completed' : `${goal.subtasks.filter(st => st.isCompleted).length} / ${goal.subtasks.length} steps`}
                    </span>
                  </div>
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-sage-200 dark:bg-black/40 shadow-inner">
                    <div
                      className={`absolute inset-0 ${goal.isCompleted
                        ? 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600'
                        : 'bg-gradient-to-r from-lime-400 via-emerald-500 to-lime-600'} animate-gradient-x`}
                      style={{
                        width: `${goal.subtasks.length > 0
                          ? Math.round((goal.subtasks.filter(st => st.isCompleted).length / goal.subtasks.length) * 100)
                          : 0}%`,
                        transition: 'width 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)'
                      }}
                    >
                      {/* Shine line */}
                      <div className="absolute top-0 bottom-0 right-0 w-[1px] bg-white/50 shadow-[0_0_10px_white]"></div>
                    </div>
                  </div>
                </div>
              )}
              {/* Loading state when subtasks are being generated */}
              {(!goal.subtasks || goal.subtasks.length === 0) && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-medium text-sage-500 dark:text-white/40">
                    <span>Generating plan...</span>
                    <span className="animate-pulse">⏳</span>
                  </div>
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-sage-200 dark:bg-black/40 shadow-inner">
                    <div className="absolute inset-0 w-1/3 bg-gradient-to-r from-lime-400 via-emerald-500 to-lime-600 animate-pulse"></div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
};

export default GoalList;