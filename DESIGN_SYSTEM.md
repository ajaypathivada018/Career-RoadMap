# Design System

Goal: keep the app visually premium, efficient to scan, and consistent across workflow-heavy screens.

Principles
- Use a restrained neutral palette with one strong accent for primary actions.
- Keep layouts roomy and structural rather than decorative.
- Reduce copy density; use cards, badges, and side panels to reveal detail progressively.
- Reserve motion for state changes, loading, and step transitions.

Tokens
- Spacing baseline: 8px.
- Typographic scale: `display-2`, `display-1`, `heading-1`, `body-lg`.
- Surfaces: `card`, `background`, `muted`, `popover`.
- Elevation: `shadow-elevated` and `shadow-elevated-sm`.

Implemented primitives
- `apps/web/components/ui/card.tsx`
- `apps/web/components/ui/button.tsx`
- `apps/web/components/ui/input.tsx`
- `apps/web/components/ui/badge.tsx`
- `apps/web/components/ui/pill.tsx`
- `apps/web/components/ui/stepper.tsx`
- `apps/web/components/ui/sideSummary.tsx`
- `apps/web/components/ui/sidePanel.tsx`
- `apps/web/components/ui/modal.tsx`
- `apps/web/components/ui/skeleton.tsx`

Implemented page patterns
- Split wizard with sticky summary panel.
- Premium command-center dashboard.
- Review modal before generate actions.
- Elevated cards for high-signal summaries and actions.

Current usage
- Design tokens live in `apps/web/app/globals.css` and `apps/web/tailwind.config.ts`.
- The generate flow and dashboard now use the new primitives.

Next refinement areas
- Apply the same treatment to course detail, roadmap, and assessment result pages.
- Add reusable field-error and toast primitives for denser forms.
- Normalize empty/loading states across the app.
