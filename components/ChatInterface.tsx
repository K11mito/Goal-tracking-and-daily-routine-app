import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage, Goal, DailyTask } from '../types';
import GlassCard from './GlassCard';
import { MessageSquare, ArrowRight, Bot } from 'lucide-react';
import { chatWithGoals, summarizeChat } from '../services/geminiService';

interface ChatInterfaceProps {
  goals: Goal[];
  tasks: DailyTask[];
  onModifyTasks: (action: 'add' | 'remove' | 'update', type: 'task' | 'goal', text?: string, id?: string) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ goals, tasks, onModifyTasks }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'model',
      text: "System online. Awaiting query.",
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<ChatMessage[]>(messages);

  // Keep ref in sync with state
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Summarize and save memory when component unmounts or page unloads
  const saveMemory = useCallback(async () => {
    const currentMessages = messagesRef.current;
    // Only summarize if there were actual user messages (more than just the initial bot message)
    if (currentMessages.length <= 2) return;

    try {
      const summary = await summarizeChat(currentMessages);
      if (summary && summary !== 'No significant context.') {
        localStorage.setItem('liquid-chat-memory', summary);
      }
    } catch (error) {
      console.error('Failed to save chat memory:', error);
    }
  }, []);

  useEffect(() => {
    // Save memory on page unload
    const handleBeforeUnload = () => {
      const currentMessages = messagesRef.current;
      if (currentMessages.length <= 2) return;

      // Use sendBeacon for reliable delivery during page unload
      // Note: sendBeacon can't set custom headers, so include userApiKey in body
      const existingMemory = localStorage.getItem('liquid-chat-memory') || undefined;
      const userKey = localStorage.getItem('liquid-user-api-key') || undefined;

      const blob = new Blob([JSON.stringify({
        messages: currentMessages.map(m => ({ role: m.role, text: m.text })),
        existingMemory,
        userApiKey: userKey,
      })], { type: 'application/json' });

      navigator.sendBeacon('/api/summarize', blob);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Also save on component unmount (e.g., navigating away within the SPA)
      saveMemory();
    };
  }, [saveMemory]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await chatWithGoals(userMsg.text, messages, goals, tasks);

      let botText = "I encountered an error.";

      if (response) {
        if (response.functionCalls && response.functionCalls.length > 0) {
          const call = response.functionCalls[0];
          if (call.name === 'manage_daily_plan') {
            const args = call.args as { action: 'add' | 'remove' | 'update'; taskText?: string; taskId?: string };
            onModifyTasks(args.action, 'task', args.taskText, args.taskId);
            botText = `Executing protocol: ${args.action} task.`;
          }
        } else if (response.text) {
          botText = response.text;
        }
      }

      const botMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'model',
        text: botText,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, botMsg]);

    } catch (error) {
      console.error(error);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <GlassCard title="Uplink" icon={<MessageSquare size={16} />} className="flex h-[500px] flex-col" delay="animate-delay-300" noPadding>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-sage-50/50 dark:bg-black/20">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex animate-enter ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded px-3 py-2 text-xs font-mono leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-lime-500/20 text-lime-800 dark:text-lime-100 border border-lime-500/30'
                  : 'bg-white/40 dark:bg-white/5 text-sage-800 dark:text-slate-300 border border-sage-200 dark:border-white/5'
              }`}
            >
              {msg.role === 'model' && <Bot size={12} className="inline-block mr-2 mb-0.5 opacity-50" />}
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
             <div className="flex gap-1 px-3 py-2">
               <div className="w-1 h-1 bg-lime-500/50 rounded-full animate-pulse"></div>
               <div className="w-1 h-1 bg-lime-500/50 rounded-full animate-pulse delay-75"></div>
               <div className="w-1 h-1 bg-lime-500/50 rounded-full animate-pulse delay-150"></div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="relative border-t border-sage-200 dark:border-white/5 bg-white/30 dark:bg-[#0B0F19] p-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Command..."
          className="w-full rounded bg-white/50 dark:bg-black/30 py-2.5 pl-4 pr-10 font-mono text-xs text-sage-900 dark:text-white placeholder-sage-500 dark:placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-lime-500/50 border border-sage-200 dark:border-transparent"
        />
        <button
          type="submit"
          disabled={!input.trim() || isTyping}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-sage-500 dark:text-slate-500 hover:text-lime-600 dark:hover:text-lime-400 disabled:opacity-30"
        >
          <ArrowRight size={14} />
        </button>
      </form>
    </GlassCard>
  );
};

export default ChatInterface;
