---
name: bugs_found
description: All bugs found in initial full-codebase audit on 2026-03-13
type: project
---

# Bugs Found — Initial Audit (2026-03-13)

## Critical
- B1: Real secret keys in .env.local (security)
- B2: api/generate.ts uses response_format:{type:'json_object'} but prompt asks for array — GPT wraps it in object, parsing relies on fragile fallback heuristics
- B3: handleTaskToggle in App.tsx reads stale `goals` closure when checking allDone (race condition)

## High
- B4: ChatInterface.tsx sends user message with stale `messages` state (pre-setState snapshot)
- B5: SettingsPanel.tsx labels the key field "Gemini API Key" but the backend uses OpenAI — user confusion + wrong placeholder (AIzaSy...)
- B6: DailyPlan handleGenerate replaces ALL tasks with setTasks(newTasks) — destroys manually added / AI-added tasks
- B7: FocusOverlay auto-starts timer (setIsActive(true)) without user interaction — AudioContext policy will silently fail to play audio
- B8: User API key exposed in sendBeacon body — logged by proxies

## Medium
- B9: GoalList progress bar uses daily tasks for percentage, not subtasks — misleading when no daily tasks generated yet
- B10: saveEdit in DailyPlan silently drops edits if editText.trim() is empty (no feedback)
- B11: Rate limiter is per-process in-memory — bypassable on Vercel multi-instance
- B12: api/generate.ts error handler returns 200 with stub subtask — hides errors from client
- B13: FocusOverlay dark mode effect (isDarkMode) missing currentRoute dependency — addRouteLayers called with stale route on style reload
- B14: White noise toggleWhiteNoise can be called during cleanup (useEffect return) after component unmounts — calls setState on unmounted context
- B15: GoalInput dueDate min attribute recalculated on every render but does not re-render when day changes mid-session

## Low
- B16: metadata.json says "powered by Gemini" — outdated, now uses OpenAI
- B17: tsconfig.json has strict checks disabled (no strict:true) — type safety holes
- B18: Service worker caches /icon-192.png and /icon-512.png which don't exist in public/ — install will fail silently
- B19: currentSubtaskIndex field on Goal type is defined but never read or updated anywhere in the codebase (dead field)
- B20: clearAllData does not clear liquid-chat-memory — memory persists after "wipe all data"
