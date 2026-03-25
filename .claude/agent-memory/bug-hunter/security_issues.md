---
name: security_issues
description: Security vulnerabilities found in initial audit (2026-03-13)
type: project
---

# Security Issues

1. **CRITICAL: Real API keys in .env.local committed to repo**
   - File: `.env.local`
   - OPENAI_API_KEY (sk-proj-...) and VITE_MAPBOX_TOKEN (pk.eyJ...) are real, live keys stored in version-controlled file.
   - `.env.local` is not listed in `.gitignore` — likely exposed in git history.

2. **HIGH: User API key transmitted in request body (sendBeacon path)**
   - File: `components/ChatInterface.tsx` lines 62-67, `api/summarize.ts` line 16
   - During page unload, userApiKey is sent in the JSON body (not header). This is intentional for sendBeacon limitation, but the key can be logged by any proxy/middleware that logs request bodies.

3. **HIGH: No validation of user-provided API key format**
   - File: `api/chat.ts`, `api/generate.ts`, `api/summarize.ts`
   - Any string from x-user-api-key header is passed directly to OpenAI. No format check. Malicious input could cause unexpected SDK behavior or error message leakage.

4. **MEDIUM: Rate limiter is in-memory and per-process**
   - File: `api/_rateLimit.ts`
   - Vercel runs multiple function instances; the store Map is not shared. A user can bypass limits by hitting different instances. Resets on cold start.
