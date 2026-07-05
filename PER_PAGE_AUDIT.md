# Per-Page Audit — Initial Inventory & UX Notes

Generated: May 29, 2026

This document lists all top-level pages discovered in `apps/web/app` with quick UX/UI observations and priority notes for redesign.

Format: Page path — Purpose — Quick issues & recommended actions

---

- `app/(marketing)/page.tsx` — Marketing landing
  - Issues: Long copy blocks, weak visual hierarchy, generic hero. Reduce text by 50%, add a concise value statement, social proof, and a CTA strip.
  - Action: Replace long text with 3 stat cards + single CTA.

- `app/(marketing)/signup/page.tsx` — Signup
  - Issues: Form density, missing inline validation, no progressive disclosure for pricing/benefits.
  - Action: Convert to minimal form + benefits sidebar; add inline validation and success microcopy.

- `app/(marketing)/login/page.tsx`, `login-otp`, `forgot-password` — Auth flows
  - Issues: Standard flows present but need consistent messages, error handling, and accessible focus states.
  - Action: Consolidate into shared auth components; add server-side error handling and UI states.

- `app/(app)/home/page.tsx` — User dashboard (Home)
  - Issues: Good baseline; still slightly text-heavy and vertically stacked sections. Some lists lack skeletons and empty states.
  - Action: Reduce paragraph length, introduce compact cards/pills, replace paragraphs with snapshot metrics and progress rings. Use `Skeleton` on loads.

- `app/(app)/dashboard/page.tsx` — Dashboard
  - Issues: May duplicate home; ensure single source of truth and consistent metrics/components.
  - Action: Consolidate dashboard components into a `Dashboard` module; add filter and timeframe controls.

- `app/(app)/courses/page.tsx`, `course-generated/[id]/page.tsx`, `generate/[topic]/page.tsx` — Course generator & listings
  - Issues: `generate/[topic]` contains very long question text and many steps. Needs multi-step UI, condensed questions, and progress bar.
  - Action: Convert to a multi-step wizard with side summary, use chips for choices, compact radio grids, inline validation, and stepper progress.

- `app/(app)/my-courses/page.tsx` — My Courses
  - Issues: Card density; weak visual hierarchy for actions.
  - Action: Introduce course cards with progress badges, primary CTA, and contextual menu for actions.

- `app/(app)/profile/page.tsx` — Profile
  - Issues: Currently verbose. Should be a compact profile panel + editable modal for details.
  - Action: Move editable fields into a modal or side panel, show key metrics on the main view.

- `app/(app)/search/page.tsx` — Search
  - Issues: Needs facet filters, saved searches, and compact results with clear primary action.
  - Action: Add left-side filters, result cards with highlights, and keyboard navigation.

- `app/(app)/roadmaps/page.tsx` — Roadmaps
  - Issues: Roadmaps often need visual timelines or swimlanes rather than long lists.
  - Action: Replace list view with a card+timeline layout and condensed progress indicators.

- `app/studio/*` — Studio (creator-facing)
  - Issues: Content-rich but uses many generic cards/lists without clear CTA hierarchy. Tables lack inline actions and compact density for creator workflows.
  - Action: Redesign to a productivity layout: left navigation, main canvas, right panel for contextual details and actions. Improve table row actions to inline quick-edit.

- Misc pages: `app/studio/analytics`, `studio/journeys`, `studio/courses` etc.
  - Issues: Need metric visualizations (charts) and KPI cards; text descriptions should be minimized.
  - Action: Add KPI cards with sparkline, status badges, and contextual filters.

---

General cross-cutting recommendations
- Reduce copy length by 40-60% (convert to microcopy, tooltips, or collapsible info).
- Implement a spacing scale and typographic rhythm across the app; use `--space-*` tokens and Tailwind utility classes mapped to them.
- Replace long vertical flows with bento/split layouts and side panels for contextual tasks.
- Add skeleton loaders (added `components/ui/skeleton.tsx`), empty states, success toasts, and inline validation components.
- Create a small component library (`components/ui/`) that includes Premium `Card`, `Button`, `Input`, `Select`, `Pill`, `Stepper`, `Badge`, `Modal`, and `SidePanel`.
- Improve accessibility: proper focus outlines, aria attributes, and keyboard navigation for core flows.

Next steps (automated):
1. Run a functional audit hitting API endpoints for auth/profile/courses (collect errors & missing validations).
2. Create a `DESIGN_SYSTEM.md` with tokens, spacing scale, and component variants to standardize UI.
3. Implement prioritized refactors: Home, Generate Wizard, Studio Dashboard.

I'll begin the functional audit now (calling API routes and checking middleware/files).
