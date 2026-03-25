import React, { useState, useMemo } from 'react';
import { DailyTask, Goal } from '../types';
import GlassCard from './GlassCard';
import { Check, RefreshCw, Trash2, ListTodo, Crosshair, Sparkles, Edit2 } from 'lucide-react';
import { generateDailyTasks } from '../services/aiService';

interface DailyPlanProps {
  goals: Goal[];
  tasks: DailyTask[];
  setTasks: React.Dispatch<React.SetStateAction<DailyTask[]>>;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (id: string, newText: string) => void;
  onFocusTask: (task: DailyTask) => void;
}

// Eisenhower Matrix color codes
type EisenhowerPriority = 'urgent-important' | 'important' | 'urgent' | 'neither';

interface EisenhowerResult {
  priority: EisenhowerPriority;
  borderColor: string;
  bgColor: string;
  label: string;
  score: number;
}

const getEisenhowerPriority = (goal: Goal | undefined): EisenhowerResult => {
  if (!goal) {
    return {
      priority: 'neither',
      borderColor: 'border-l-blue-400',
      bgColor: 'bg-blue-400/10',
      label: 'Low Priority',
      score: 1
    };
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const dueDate = new Date(goal.dueDate);
  dueDate.setHours(0, 0, 0, 0);
  const daysRemaining = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const isUrgent = daysRemaining <= 3; // Close due date
  const isImportant = goal.importance >= 7; // High importance

  if (isImportant && isUrgent) {
    return {
      priority: 'urgent-important',
      borderColor: 'border-l-red-500',
      bgColor: 'bg-red-500/10',
      label: 'DO FIRST',
      score: 4
    };
  } else if (isImportant) {
    return {
      priority: 'important',
      borderColor: 'border-l-purple-500',
      bgColor: 'bg-purple-500/10',
      label: 'SCHEDULE',
      score: 3
    };
  } else if (isUrgent) {
    return {
      priority: 'urgent',
      borderColor: 'border-l-yellow-500',
      bgColor: 'bg-yellow-500/10',
      label: 'DELEGATE',
      score: 2
    };
  } else {
    return {
      priority: 'neither',
      borderColor: 'border-l-blue-400',
      bgColor: 'bg-blue-400/10',
      label: 'LATER',
      score: 1
    };
  }
};

const DailyPlan: React.FC<DailyPlanProps> = ({
  goals,
  tasks,
  setTasks,
  onToggleTask,
  onDeleteTask,
  onUpdateTask,
  onFocusTask
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Sort tasks by Eisenhower priority
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const goalA = goals.find(g => g.id === a.associatedGoalId);
      const goalB = goals.find(g => g.id === b.associatedGoalId);
      const priorityA = getEisenhowerPriority(goalA);
      const priorityB = getEisenhowerPriority(goalB);

      // Completed tasks go to the bottom
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1;
      }

      // Sort by priority score (higher = more urgent/important)
      return priorityB.score - priorityA.score;
    });
  }, [tasks, goals]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    const newTasks = await generateDailyTasks(goals);
    setTasks((prev: DailyTask[]) => [...prev.filter((t: DailyTask) => !t.associatedGoalId), ...newTasks]);
    setIsGenerating(false);
  };

  const getGoalCategory = (goalId?: string) => {
    const goal = goals.find(g => g.id === goalId);
    return goal ? goal.category : null;
  };

  const startEditing = (e: React.MouseEvent, task: DailyTask) => {
    e.stopPropagation();
    setEditingId(task.id);
    setEditText(task.text);
  };

  const saveEdit = (id: string) => {
    if (editText.trim()) {
      onUpdateTask(id, editText);
    }
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') saveEdit(id);
    if (e.key === 'Escape') setEditingId(null);
  };

  return (
    <GlassCard
      title="Daily Protocol"
      icon={<Sparkles size={18} />}
      className="h-full flex flex-col"
      delay="animate-delay-200"
      noPadding
      action={
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="rounded-full bg-black/5 dark:bg-white/5 p-2 text-sage-700 dark:text-white hover:bg-lime-400 hover:text-black hover:shadow-[0_0_15px_rgba(190,242,100,0.6)] disabled:opacity-50 transition-all duration-300"
        >
          <RefreshCw size={16} className={isGenerating ? 'animate-spin' : ''} />
        </button>
      }
    >
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center text-sage-400 dark:text-white/30">
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-lime-500 blur-xl opacity-20"></div>
              <ListTodo size={48} className="relative opacity-50 text-lime-600 dark:text-lime-100" />
            </div>
            <p className="mb-6 font-medium tracking-wide">Awaiting Tactical Input</p>
            <button
              onClick={handleGenerate}
              className="relative overflow-hidden rounded-full bg-lime-400 dark:bg-lime-300 px-8 py-3 font-bold text-black shadow-[0_0_20px_rgba(190,242,100,0.3)] transition-transform active:scale-95 group"
            >
              <div className="absolute inset-0 bg-white/40 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              <span>Generate Protocol</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {sortedTasks.map((task, index) => {
              const goal = goals.find(g => g.id === task.associatedGoalId);
              const category = getGoalCategory(task.associatedGoalId);
              const isEditing = editingId === task.id;
              const eisenhower = getEisenhowerPriority(goal);

              return (
                <div
                  key={task.id}
                  onClick={() => !isEditing && onToggleTask(task.id)}
                  className={`
                    group relative flex items-center gap-4 p-4 rounded-2xl border-l-4 border transition-all duration-500 cursor-pointer overflow-hidden
                    ${eisenhower.borderColor}
                    ${task.isCompleted
                      ? 'bg-black/5 dark:bg-black/20 border-r-sage-200 border-t-sage-200 border-b-sage-200 dark:border-r-white/5 dark:border-t-white/5 dark:border-b-white/5 opacity-50 scale-[0.98]'
                      : `${eisenhower.bgColor} border-r-sage-200 border-t-sage-200 border-b-sage-200 dark:border-r-white/5 dark:border-t-white/5 dark:border-b-white/5 hover:border-r-lime-500/30 hover:border-t-lime-500/30 hover:border-b-lime-500/30 hover:shadow-md dark:hover:shadow-[0_10px_30px_-5px_rgba(0,0,0,0.5)] hover:scale-[1.01]`
                    }
                  `}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Glowing Checkbox */}
                  <div className="shrink-0 relative">
                    <div className={`
                      flex h-6 w-6 items-center justify-center rounded-full border-[1.5px] transition-all duration-300
                      ${task.isCompleted
                        ? 'border-lime-500 dark:border-lime-400 bg-lime-500 dark:bg-lime-400 shadow-[0_0_15px_rgba(190,242,100,0.5)]'
                        : 'border-sage-300 dark:border-white/20 group-hover:border-lime-500 dark:group-hover:border-lime-300'}
                    `}>
                      {task.isCompleted && <Check size={14} className="text-white dark:text-black font-bold" strokeWidth={4} />}
                    </div>
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5 z-10">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onBlur={() => saveEdit(task.id)}
                        onKeyDown={(e) => handleKeyDown(e, task.id)}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                        className="w-full bg-transparent border-b border-lime-500 font-medium text-[16px] text-sage-900 dark:text-white focus:outline-none"
                      />
                    ) : (
                      <span className={`text-[16px] font-medium leading-snug break-words transition-all duration-500 flex items-center gap-2 group/text ${task.isCompleted ? 'text-sage-400 dark:text-white/30 line-through' : 'text-sage-900 dark:text-white group-hover:text-lime-800 dark:group-hover:text-lime-50'}`}>
                        {task.text}
                        {!task.isCompleted && (
                          <button
                            onClick={(e) => startEditing(e, task)}
                            className="opacity-0 group-hover/text:opacity-50 hover:!opacity-100 p-1 text-sage-500 dark:text-white/50"
                          >
                            <Edit2 size={12} />
                          </button>
                        )}
                      </span>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      {category && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-sage-500 dark:text-white/40 group-hover:text-lime-700 dark:group-hover:text-lime-300/70 transition-colors">
                          {category}
                        </span>
                      )}
                      {/* Step Progress */}
                      {goal && goal.subtasks && goal.subtasks.length > 0 && !task.isCompleted && (
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-lime-500/10 text-lime-700 dark:text-lime-300">
                          Step {goal.subtasks.filter(st => st.isCompleted).length + 1} of {goal.subtasks.length}
                        </span>
                      )}
                      {!task.isCompleted && (
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${eisenhower.priority === 'urgent-important' ? 'bg-red-500/20 text-red-600 dark:text-red-400' :
                          eisenhower.priority === 'important' ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400' :
                            eisenhower.priority === 'urgent' ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' :
                              'bg-blue-400/20 text-blue-600 dark:text-blue-400'
                          }`}>
                          {eisenhower.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-x-2 group-hover:translate-x-0">
                    {!task.isCompleted && !isEditing && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onFocusTask(task);
                        }}
                        className="rounded-full p-2 text-sage-500 dark:text-white/50 hover:bg-lime-400 hover:text-black transition-all shadow-lg"
                        title="Focus Mode"
                      >
                        <Crosshair size={20} />
                      </button>
                    )}
                    {!isEditing && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTask(task.id);
                        }}
                        className="rounded-full p-2 text-sage-500 dark:text-white/50 hover:bg-red-500 hover:text-white transition-all shadow-lg"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>

                  {/* Subtle sweep animation on hover */}
                  {!task.isCompleted && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none"></div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </GlassCard>
  );
};

export default DailyPlan;