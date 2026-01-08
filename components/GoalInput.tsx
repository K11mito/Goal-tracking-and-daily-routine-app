import React, { useState } from 'react';
import { Plus, Target, Calendar } from 'lucide-react';
import { GoalCategory } from '../types';
import GlassCard from './GlassCard';

interface GoalInputProps {
  onAddGoal: (text: string, category: GoalCategory, importance: number, dueDate: number) => void;
}

// Helper to get date string in YYYY-MM-DD format
const getDefaultDueDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7); // Default 7 days from now
  return date.toISOString().split('T')[0];
};

const GoalInput: React.FC<GoalInputProps> = ({ onAddGoal }) => {
  const [text, setText] = useState('');
  const [category, setCategory] = useState<GoalCategory>(GoalCategory.Personal);
  const [importance, setImportance] = useState(5);
  const [dueDate, setDueDate] = useState(getDefaultDueDate());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && dueDate) {
      const dueDateTimestamp = new Date(dueDate).getTime();
      onAddGoal(text, category, importance, dueDateTimestamp);
      setText('');
      setImportance(5);
      setDueDate(getDefaultDueDate());
    }
  };

  return (
    <GlassCard title="New Goal" icon={<Target size={20} />} delay="animate-delay-100">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* iOS Input Field Style */}
        <div className="relative">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What needs to be done?"
            className="w-full rounded-xl bg-white/50 dark:bg-[#222222] py-3.5 px-4 text-[17px] text-sage-900 dark:text-white placeholder-sage-500 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-lime-500/50 transition-all border border-sage-200 dark:border-white/5 shadow-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as GoalCategory)}
              className="w-full appearance-none rounded-xl bg-white/50 dark:bg-[#222222] px-4 py-3 text-[15px] font-medium text-sage-900 dark:text-white focus:outline-none border border-sage-200 dark:border-white/5 shadow-sm"
            >
              {Object.values(GoalCategory).map((cat) => (
                <option key={cat} value={cat} className="bg-cream dark:bg-[#1C1C1E] text-sage-900 dark:text-white">
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col justify-center rounded-xl bg-white/50 dark:bg-[#222222] px-4 py-2 border border-sage-200 dark:border-white/5 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-sage-500 dark:text-gray-400 uppercase">Priority</span>
              <span className="text-[11px] font-bold text-lime-600 dark:text-lime-300">{importance}</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={importance}
              onChange={(e) => setImportance(Number(e.target.value))}
              className="h-1 w-full cursor-pointer appearance-none rounded-full bg-sage-300 dark:bg-gray-600 accent-lime-500 dark:accent-lime-400"
            />
          </div>
        </div>

        {/* Due Date Picker */}
        <div className="relative flex items-center gap-3 rounded-xl bg-white/50 dark:bg-[#222222] px-4 py-3 border border-sage-200 dark:border-white/5 shadow-sm">
          <Calendar size={18} className="text-sage-500 dark:text-gray-400 shrink-0" />
          <div className="flex-1 flex flex-col">
            <span className="text-[11px] font-semibold text-sage-500 dark:text-gray-400 uppercase">Due Date</span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="bg-transparent text-[15px] font-medium text-sage-900 dark:text-white focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-lime-400 dark:bg-lime-300 py-3.5 text-[17px] font-bold text-sage-900 dark:text-black transition-all hover:bg-lime-500 dark:hover:bg-lime-400 active:scale-[0.98] shadow-[0_0_15px_rgba(190,242,100,0.3)]"
        >
          <Plus size={20} strokeWidth={3} />
          <span>Add Goal</span>
        </button>
      </form>
    </GlassCard>
  );
};

export default GoalInput;