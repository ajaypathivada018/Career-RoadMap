UI Audit Phase 2 — Prioritized Frontend Refactor Plan

Scope: apps/web (Next.js app router)

Goals:
- Improve information hierarchy, spacing, and typography for premium SaaS feel
- Introduce SidePanel and Modal primitives and migrate Studio/Dashboard pages
- Replace tall vertical stacks with split layouts for generate and studio flows
- Add form validation and consistent error states across the frontend

Priority pages/components to refactor (high → low):
- /app/(app)/generate/[topic]/page.tsx — already partially refactored, finish split layout and side summary
- /app/(app)/studio/* — migrate to productivity split layout with SidePanel for resource editing
- /app/(app)/dashboard — add analytics summary cards, reduce dense copy
- /app/(app)/courses/* — unify course card UI, add curated/author metadata
- /components/ui/* — add SidePanel.tsx, Modal.tsx, Form/Field primitives, Toast

Quick actions (iterative):
1. Create `components/ui/SidePanel.tsx` and `Modal.tsx` primitives.
2. Finish `generate` page split layout (sticky summary, responsive collapse).
3. Replace inline forms with `FormField` primitives that show validation errors.
4. Run visual review and adjust Tailwind tokens for spacing/typography.

Next immediate step: create SidePanel and Modal primitives and integrate them into one small page (generate).