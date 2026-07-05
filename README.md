# Career Sync

AI-powered career platform: roadmaps, on-demand courses, and skill assessments — backed by your own profile data.

## Architecture

```
Career OS/
├── apps/
│   ├── api/    Express + MongoDB (JWT auth, profile, courses, roadmaps, skills)
│   └── web/    Next.js 15 App Router (unified frontend, shadcn-style UI)
├── render.yaml Render blueprint for the API service
├── package.json Workspace root (scripts only, no deps)
└── scripts/   Operational helpers
```

Frontends previously lived as four separate Render deployments (`landing-page`, `course-generation`, `roadmap`, `test-generation`). Phase 2 unified them into a single Next.js app under `apps/web/`.

## Local development

### Prerequisites
- Node 20+
- MongoDB Atlas connection string (or local MongoDB)

### One-time install
```bash
npm run install:all
```

### Env files

`apps/api/.env`:
```
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
GEMINI_API_KEY=...
OPENROUTER_API_KEY=...
YOUTUBE_API_KEY=...
# Comma-separated allowlist for production CORS. Localhost dev origins are always allowed.
CORS_ORIGINS=https://your-vercel-domain.vercel.app
```

`apps/web/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_YOUTUBE_API_KEY=...
# Optional local-only middleware bypass for auth_token query params on protected routes.
# Keep unset/false for production parity.
ENABLE_URL_AUTH_BYPASS=false
```

### Run

In two terminals:
```bash
npm run start:api   # Express on :5000
npm run start:web   # Next.js on :3002
```

Or run them via your shell of choice in parallel.

### Verify

- API health: `curl http://localhost:5000/api/health`
- Web: open `http://localhost:3002`
- Phase 0/1 verifiers (auth/ownership invariants):
  ```bash
  npm run test:phase0
  npm run test:phase1
  ```

## Routes

Marketing (public):
- `/`, `/login`, `/signup`

App (auth-gated by `middleware.ts` on the `Career_Sync_token` cookie):
- `/dashboard` — legacy route, now redirects to `/home`
- `/home` — primary authenticated landing page
- `/courses`, `/course/[slug]`, `/course-generated/[id]`, `/generate/[topic]`, `/my-courses`
- `/roadmaps` — form → assessment → workspace flow
- `/assessments`, `/assessments/test/[courseId]`, `/assessments/result/[courseId]`
- `/profile`, `/settings`
- `/studio/*` — educator/admin area

## Mock API helper (optional)

For local frontend verification without the full backend stack:

```bash
node scripts/mock-api.js
```

Notes:
- Runs on `http://localhost:5000` by default
- Port can be overridden with `MOCK_API_PORT` or `PORT`
- If the port is already in use, the script prints `Mock API already running...` and exits cleanly

Test credentials:
- Email: `test@skillroute.ai`
- Password: `Test@1234`

## QA checkpoint (May 2026)

Verified locally:
- Auth bootstrap persists through the `Career_Sync_token` cookie and local storage
- `/home` renders authenticated data after hydration
- `/profile` shows full user details, heatmap activity, and sectioned learning history
- `/courses` opens the generator home (no longer the old suggestions browser)
- `/dashboard` redirects to `/home`

Backend endpoints (all `/api/` prefix):
- `auth` — register, login, verify (OTP), reset-password, me, logout
- `courses` — list, get, save, generate, progress
- `roadmaps` — CRUD
- `skills` — evaluate, submit
- `profile` — fetch, enroll, update progress

## Deployment

**Frontend (Vercel)**
1. Connect the GitHub repo to a new Vercel project
2. Settings → **Root Directory** → `apps/web`
3. Add env vars: `NEXT_PUBLIC_API_URL=https://<your-render-api>.onrender.com/api`, `NEXT_PUBLIC_YOUTUBE_API_KEY=...`
4. Deploy

**Backend (Render)**
1. Push to `main`; Render picks up [render.yaml](render.yaml) automatically (Blueprint)
2. Set the synced env vars in Render dashboard: `MONGODB_URI`, `JWT_SECRET`, `CORS_ORIGINS=https://<your-vercel>.vercel.app`, `GEMINI_API_KEY`, etc.
3. **MongoDB Atlas → Network Access** must allow Render outbound IPs (or `0.0.0.0/0` for simplicity)

## Phase history

| Phase | Outcome |
|---|---|
| **0** | Auth middleware stabilization, env cleanup, build fixes, route consistency |
| **1** | MongoDB ownership checks (`userOwnsParam`), JWT/cookie token normalization, persistence guarantees |
| **2** | Unified `apps/api` + `apps/web`; shadcn-style design system; deleted 4 fragmented frontends; 1-service Render deploy + Vercel for web |

## Known follow-ups

- **Rotate the RapidAPI key** — it was previously hardcoded in client source and leaked into git history. The runtime now reads `RAPIDAPI_KEY` from `apps/api/.env`, but the leaked value should be rotated in the RapidAPI dashboard.
- **Visual polish on /roadmaps** — ✅ Done. All 10 components (`HomePage`, `SimulationForm`, `SkillsInput`, `AssessmentPage`, `CareerWorkspacePage`, `SimulationResults`, `PathwayCard`, `StatsCard`, `AlertBanner`, `RoadmapMindMap`, `TipBanner`) now use shadcn primitives + Tailwind. The 12 legacy CSS modules and the dead `ResultsPage` + `APIConfigurationModal` + `Layout/Footer` artifacts were deleted.
- **`apps/web/app/api/{generate-course,search}`** — direct OpenRouter/mock calls from Next API routes. They're server-side (keys never reach the browser), so this is a symmetry choice rather than a security one. Folding into Express would let `/api/courses/generate` use the existing modular services in `apps/api/services/generationOrchestrator.ts` (the WIP `routes/course-generation-v2.js` is ready to wire up).
- **/settings extensions** — current page shows account info and a "Change password" entry. Editing name, theme toggle, notification prefs, "sign out all devices" all need new backend endpoints.
- **Profile drill-down** — legacy `profile.html` had a "click a course → see modules" slide-over that wasn't ported.
- **E2E test harness** (Playwright) for golden paths.
