# Project Audit — Phase 1 (Initial)

Repository summary:
- Frontend: apps/web (Next.js app router, Tailwind)
- Backend: apps/api (Node/Express-like API, MongoDB)
- Shared: scripts, utils, apps/api models and services

Initial scan highlights:

Functional Issues (first-pass):
- Console logging and debug output present in multiple scripts (check-credits.js, list-models.js).
- Needs environment validation and fail-safe error handling in scripts and API routes.
- Unknown coverage of loading/error states across frontend pages; many components likely missing skeleton loaders.
- Authentication middleware present in `apps/api/middleware/auth.js` but not yet audited for edge cases.

UX Issues (first-pass):
- UI described as generic / prototype-like; heavy text density in many pages.
- Vertical stacking and long paragraphs likely across pages; need to convert to scannable cards and indicators.
- Onboarding and progressive disclosure likely weak — many explanatory paragraphs exist.

UI Issues (first-pass):
- No centralized design system or component library; components appear generated.
- Tailwind is present but needs a disciplined token set (typography scale, spacing system, color tokens).
- Typography and spacing are inconsistent; global styles need refinement (fonts, sizes, line-height).

Next steps:
1. Full route and page inventory (frontend pages & API endpoints).
2. Automated grep for debug/console/TODO occurrences (in-progress).
3. Deep functional audit: run the app locally, exercise auth flows, API endpoints.
4. Full UX audit: inspect each page and component, capture screenshots and recommendations.
5. Design system proposal and implement core tokens (typography, spacing, colors) in Tailwind.
6. Refactor key layouts: Dashboard, Course pages, Studio.
7. Add skeletons, empty states, and improved forms.
8. E2E testing of user journeys.

I'll continue mapping routes and components now and produce a detailed inventory next.

Progress update (changes applied):

- Added a reusable `Skeleton` loader component: `apps/web/components/ui/skeleton.tsx`.
- Introduced premium baseline styles: imported `Inter` font, added typographic tokens, and elevated shadow tokens in `tailwind.config.ts` and `app/globals.css`.
- Refined component bases for `Card`, `Button`, and `Input` to use elevated shadows, improved spacing, and better hover/focus states.

Next actions being worked on now:
- Deep functional audit (auth, API endpoints, DB interactions).
- Per-page UX review and content reduction plan.

I'll proceed to enumerate per-page audits and then implement a centralized design token module and component variants.
