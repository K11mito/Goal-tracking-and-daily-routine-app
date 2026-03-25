---
name: project_architecture
description: Stack, file layout, and architectural patterns for get-shit-done-mf
type: project
---

# Project Architecture

**Stack:** React 19 + Vite SPA, Vercel serverless API routes (TypeScript), OpenAI GPT-4o-mini, Mapbox GL JS, PWA (service worker).

**Key files:**
- `App.tsx` — root state owner (goals, tasks, focusedTask). All major handlers live here.
- `api/chat.ts`, `api/generate.ts`, `api/summarize.ts` — Vercel serverless functions using OpenAI SDK.
- `api/_rateLimit.ts` — In-memory IP rate limiter (resets on cold start).
- `services/aiService.ts` — Client-side fetch wrappers for all three API routes.
- `services/mapUsageTracker.ts` — localStorage-based monthly map load counter.
- `components/DailyPlan.tsx` — Task list with Eisenhower matrix sort.
- `components/ChatInterface.tsx` — Chat UI with memory save on unmount/unload.
- `components/FocusOverlay.tsx` — Pomodoro timer + Mapbox animated flight path.
- `components/SettingsPanel.tsx` — BYOK API key management + memory viewer.

**State persistence:** All goals/tasks in localStorage (liquid-goals, liquid-tasks). Chat memory in liquid-chat-memory. User API key in liquid-user-api-key.

**Auth model:** BYOK (bring your own key) — user key sent as x-user-api-key header. Server OPENAI_API_KEY is rate-limited fallback.
