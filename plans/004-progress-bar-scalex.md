# 004 — Animate the batch progress bar with `scaleX`, not `width`

- **Status**: DONE
- **Commit**: a322df8
- **Severity**: MEDIUM
- **Category**: Performance
- **Estimated scope**: 1 file, 1 element

## Problem

The batch progress bar animates `width` — a layout property that forces layout + paint on every update — via `transition-all`, while a queue of images is actively being compressed (the busiest moment in the app):

```tsx
/* apps/web/components/optimizer-queue-panel.tsx:120-125 — current */
<div className="h-1 bg-gray-alpha-300 w-full rounded-full overflow-hidden">
  <div
    className="h-full bg-gray-1000 transition-all duration-300 ease-out"
    style={{ width: `${processPercent}%` }}
  />
</div>
```

## Target

The fill spans the full width and scales on the compositor:

```tsx
/* target */
<div className="h-1 bg-gray-alpha-300 w-full rounded-full overflow-hidden">
  <div
    className="h-full w-full origin-left bg-gray-1000 transition-transform duration-300 ease-out"
    style={{ transform: `scaleX(${processPercent / 100})` }}
  />
</div>
```

- `origin-left` (i.e. `transform-origin: left`) so the bar grows from the left edge exactly as before.
- Keep `duration-300 ease-out` — transitions retarget from the current value, so stepped progress updates still glide.
- The track (outer div) is unchanged; it already clips with `overflow-hidden`.

## Repo conventions to follow

- Inline `style` for dynamic values, Tailwind utilities for static ones — exactly as the current code does.

## Steps

1. **`apps/web/components/optimizer-queue-panel.tsx`** — replace the inner fill div (current lines 121-124) with the target code above. Two changes: className `transition-all` → `w-full origin-left transition-transform`, and `style` `width: …%` → `transform: scaleX(fraction)`.

## Boundaries

- Do NOT touch anything else in this file (the `transition-colors` on the `<aside>` and the empty-state button are fine).
- Do NOT change the bar's height, colors, or rounding.
- If the code doesn't match verbatim (drift since commit a322df8), STOP and report instead of improvising.

## Verification

- **Mechanical**: `cd apps/web && bun run typecheck` passes; `bun run check` at the repo root passes.
- **Feel check**: `bun run dev`, drop 5+ images at once:
  - The bar fills left → right in smooth steps, visually identical to before.
  - At 0% the bar is invisible; at 100% it exactly fills the track with no overhang or gap at the right edge.
  - DevTools Performance panel while processing: the bar's updates show no purple Layout entries attributable to the fill element.
- **Done when**: the bar animates via `transform` only and looks unchanged at normal speed.
