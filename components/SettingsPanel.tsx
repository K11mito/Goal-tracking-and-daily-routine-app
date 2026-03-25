import React, { useState, useEffect } from 'react';
import { X, Key, Trash2, Check } from 'lucide-react';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [memory, setMemory] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem('liquid-user-api-key');
      setHasKey(!!stored);
      setApiKey('');
      setSaved(false);
      setMemory(localStorage.getItem('liquid-chat-memory'));
    }
  }, [isOpen]);

  const saveKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('liquid-user-api-key', apiKey.trim());
      setHasKey(true);
      setApiKey('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const removeKey = () => {
    localStorage.removeItem('liquid-user-api-key');
    setHasKey(false);
    setApiKey('');
  };

  const clearMemory = () => {
    localStorage.removeItem('liquid-chat-memory');
    setMemory(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-md mx-4 rounded-2xl bg-white/90 dark:bg-[#1c1c1e]/95 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-2xl p-6 animate-enter"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-sage-500 dark:text-slate-400 transition-colors"
        >
          <X size={16} />
        </button>

        <h2 className="text-lg font-bold text-sage-900 dark:text-white mb-1 flex items-center gap-2">
          <Key size={18} className="text-lime-600" />
          Settings
        </h2>
        <p className="text-xs text-sage-500 dark:text-slate-500 mb-6">Configure your experience</p>

        {/* API Key Section */}
        <div className="mb-6">
          <label className="block text-xs font-bold uppercase tracking-wider text-sage-700 dark:text-slate-300 mb-2">
            OpenAI API Key
          </label>
          <p className="text-[11px] text-sage-500 dark:text-slate-500 mb-3">
            Add your own OpenAI API key for unlimited usage. Get one at{' '}
            <span className="text-lime-600 dark:text-lime-400">platform.openai.com/api-keys</span>
          </p>

          {hasKey ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded bg-lime-500/10 border border-lime-500/20 px-3 py-2 text-xs font-mono text-lime-700 dark:text-lime-300 flex items-center gap-2">
                <Check size={12} />
                API key configured
              </div>
              <button
                onClick={removeKey}
                className="p-2 rounded-lg hover:bg-red-500/10 text-sage-400 dark:text-slate-500 hover:text-red-500 transition-colors"
                title="Remove key"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="flex-1 rounded bg-white/50 dark:bg-black/30 px-3 py-2 font-mono text-xs text-sage-900 dark:text-white placeholder-sage-400 dark:placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-lime-500/50 border border-sage-200 dark:border-white/10"
                onKeyDown={e => e.key === 'Enter' && saveKey()}
              />
              <button
                onClick={saveKey}
                disabled={!apiKey.trim()}
                className="px-4 py-2 rounded bg-lime-500/20 text-lime-700 dark:text-lime-300 text-xs font-bold uppercase tracking-wider hover:bg-lime-500/30 disabled:opacity-30 transition-colors border border-lime-500/20"
              >
                {saved ? 'Saved' : 'Save'}
              </button>
            </div>
          )}
        </div>

        {/* Chat Memory Section */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-sage-700 dark:text-slate-300 mb-2">
            Chat Memory
          </label>
          {memory ? (
            <>
              <div className="rounded bg-white/50 dark:bg-black/20 border border-sage-200 dark:border-white/5 p-3 text-[11px] text-sage-600 dark:text-slate-400 font-mono max-h-32 overflow-y-auto custom-scrollbar mb-2">
                {memory}
              </div>
              <button
                onClick={clearMemory}
                className="text-[11px] text-sage-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors flex items-center gap-1"
              >
                <Trash2 size={10} />
                Clear memory
              </button>
            </>
          ) : (
            <p className="text-[11px] text-sage-400 dark:text-slate-500">
              No memory stored yet. Chat with the AI and it will remember context across sessions.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
