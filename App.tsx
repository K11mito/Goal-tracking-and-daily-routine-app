import React, { useState, useEffect } from 'react';
import { Goal, GoalCategory, DailyTask } from './types';
import GoalInput from './components/GoalInput';
import GoalList from './components/GoalList';
import DailyPlan from './components/DailyPlan';
import ChatInterface from './components/ChatInterface';
import Background from './components/Background';
import FocusOverlay from './components/FocusOverlay';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { Terminal, Download, Trash, Bell, BellOff, Activity, Hexagon, Moon, Sun } from 'lucide-react';

const AppContent: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  const [goals, setGoals] = useState<Goal[]>(() => {
    try {
      const saved = localStorage.getItem('liquid-goals');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [tasks, setTasks] = useState<DailyTask[]>(() => {
    try {
      const saved = localStorage.getItem('liquid-tasks');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [focusedTask, setFocusedTask] = useState<DailyTask | null>(null);

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    }
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    localStorage.setItem('liquid-goals', JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem('liquid-tasks', JSON.stringify(tasks));
  }, [tasks]);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setNotificationsEnabled(true);
    }
  };

  const sendNotification = (title: string, body: string) => {
    if (notificationsEnabled && 'Notification' in window && document.visibilityState === 'hidden') {
      new Notification(title, { body, icon: "/icon.png" });
    }
  };

  const addGoal = (text: string, category: GoalCategory, importance: number, dueDate: number) => {
    setGoals(prev => [...prev, {
      id: crypto.randomUUID(),
      text,
      category,
      importance,
      dueDate,
      createdAt: Date.now(),
      totalCompletedTasks: 0
    }]);
  };

  const removeGoal = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  const updateGoal = (id: string, newText: string) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, text: newText } : g));
  };

  const updateTask = (id: string, newText: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, text: newText } : t));
  };

  const deleteTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task?.isCompleted && task.associatedGoalId) {
      setGoals(prevGoals => prevGoals.map(g => {
        if (g.id === task.associatedGoalId) {
          return { ...g, totalCompletedTasks: Math.max(0, g.totalCompletedTasks - 1) };
        }
        return g;
      }));
    }
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const handleTaskToggle = (taskId: string) => {
    let currentTask = tasks.find(t => t.id === taskId);
    if (!currentTask) return;

    const isNowComplete = !currentTask.isCompleted;

    setTasks(prevTasks => prevTasks.map(t => {
      if (t.id === taskId) return { ...t, isCompleted: isNowComplete };
      return t;
    }));

    if (currentTask.associatedGoalId) {
      setGoals(prevGoals => prevGoals.map(g => {
        if (g.id === currentTask.associatedGoalId) {
          const currentXP = g.totalCompletedTasks || 0;
          return { ...g, totalCompletedTasks: isNowComplete ? currentXP + 1 : Math.max(0, currentXP - 1) };
        }
        return g;
      }));
      if (isNowComplete) sendNotification("Objective Complete", "+1 XP");
    }
  };

  // AI Modification Handler
  const handleAIModification = (action: 'add' | 'remove' | 'update', type: 'task' | 'goal', text?: string, id?: string) => {
    if (type === 'task') {
      if (action === 'add' && text) {
        setTasks(prev => [...prev, {
          id: crypto.randomUUID(),
          text,
          isCompleted: false
        }]);
      } else if (action === 'remove' && id) {
        deleteTask(id);
      } else if (action === 'update' && id && text) {
        updateTask(id, text);
      }
    }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  const clearAllData = () => {
    if (window.confirm("CONFIRM PROTOCOL: WIPE ALL DATA?")) {
      setGoals([]);
      setTasks([]);
      localStorage.removeItem('liquid-goals');
      localStorage.removeItem('liquid-tasks');
    }
  };

  const startFocus = (task: DailyTask) => {
    setFocusedTask(task);
  };

  const cancelFocus = () => {
    setFocusedTask(null);
  };

  const completeFocus = () => {
    if (focusedTask) {
      if (!focusedTask.isCompleted) {
        handleTaskToggle(focusedTask.id);
      }
      setFocusedTask(null);
      sendNotification("Mission Accomplished", "Focus session completed.");
    }
  };

  return (
    <div className="min-h-screen text-sage-900 dark:text-slate-300 pb-20 selection:bg-lime-300/30 selection:text-black dark:selection:text-white transition-colors duration-500">
      <Background />

      {focusedTask && (
        <FocusOverlay
          task={focusedTask}
          onComplete={completeFocus}
          onCancel={cancelFocus}
        />
      )}

      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <header className="animate-enter mb-16 mt-8 flex flex-col items-center justify-center text-center relative z-10">
          <div className="mb-6 flex items-center justify-between w-full max-w-xs md:max-w-md">
            <div className="w-10"></div> {/* Spacer */}

            {/* Center Icon with Pulse */}
            <div className="relative group cursor-default">
              <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-lime-500 to-emerald-600 opacity-20 blur-2xl group-hover:opacity-40 transition duration-1000"></div>
              <div className="relative flex items-center justify-center h-20 w-20 rounded-2xl bg-white/30 dark:bg-black/40 border border-white/20 dark:border-white/10 shadow-2xl backdrop-blur-xl group-hover:scale-105 transition-transform duration-300">
                <Hexagon size={40} className="text-lime-600 dark:text-lime-300 drop-shadow-[0_0_10px_rgba(190,242,100,0.3)]" strokeWidth={1.5} />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={toggleTheme} className="p-2.5 rounded-full bg-white/20 dark:bg-white/5 border border-white/10 text-sage-800 dark:text-white hover:bg-white/30 transition-colors">
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              {deferredPrompt && (
                <button onClick={handleInstallClick} className="p-2.5 rounded-full bg-white/20 dark:bg-white/5 text-sage-800 dark:text-white hover:bg-white/30 transition-colors border border-white/10" title="Install">
                  <Download size={20} />
                </button>
              )}
              <button onClick={requestNotificationPermission} className={`p-2.5 rounded-full bg-white/20 dark:bg-white/5 border border-white/10 transition-colors ${notificationsEnabled ? 'text-lime-600 dark:text-lime-400 bg-lime-400/10' : 'text-sage-500 dark:text-slate-400 hover:text-sage-900 dark:hover:text-white'}`}>
                {notificationsEnabled ? <Bell size={20} /> : <BellOff size={20} />}
              </button>
            </div>
          </div>

          <h1 className="relative text-5xl font-black uppercase tracking-tight md:text-7xl select-none cursor-default">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-sage-800 via-lime-600 to-emerald-700 dark:from-white dark:via-lime-100 dark:to-emerald-200 animate-gradient-x bg-300%">
              GET SHIT DONE
            </span>
          </h1>

          <div className="mt-4 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-lime-700/50 dark:text-lime-200/50">
            <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 dark:bg-white/5 border border-white/10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-lime-500"></span>
              </span>
              System Online
            </span>
            <span className="opacity-20">///</span>
            <span>OS 2.2</span>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column */}
          <div className="flex flex-col gap-8 lg:col-span-4">
            <GoalInput onAddGoal={addGoal} />
            <div className="flex-1 min-h-[400px]">
              <GoalList
                goals={goals}
                tasks={tasks}
                onRemoveGoal={removeGoal}
                onUpdateGoal={updateGoal}
              />
            </div>
          </div>

          {/* Center Column */}
          <div className="lg:col-span-4 h-full">
            <DailyPlan
              goals={goals}
              tasks={tasks}
              setTasks={setTasks}
              onToggleTask={handleTaskToggle}
              onDeleteTask={deleteTask}
              onUpdateTask={updateTask}
              onFocusTask={startFocus}
            />
          </div>

          {/* Right Column */}
          <div className="lg:col-span-4">
            <ChatInterface
              goals={goals}
              tasks={tasks}
              onModifyTasks={handleAIModification}
            />
          </div>
        </div>

        {/* Footer */}
        <footer className="animate-enter animate-delay-300 mt-24 flex flex-col items-center gap-4 text-center">
          <button
            onClick={clearAllData}
            className="group flex items-center gap-2 rounded-full px-6 py-3 bg-white/20 dark:bg-white/5 border border-white/10 font-bold text-[10px] uppercase tracking-widest text-sage-600 dark:text-slate-500 transition-all hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400 hover:border-red-500/20"
          >
            <Trash size={12} className="transition-transform group-hover:scale-110" />
            Reset System
          </button>
        </footer>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;