# 005 — Make reduced-motion drop movement without killing feedback

- **Status**: DONE
- **Commit**: a322df8
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 1 file (`apps/web/app/globals.css`), one block

## Problem

The global reduced-motion block nukes _all_ motion indiscriminately:

```css
/* apps/web/app/globals.css:499-508 — current */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
```

Reduced motion means _gentler_, not _zero_: vestibular triggers are movement (translation, scaling, parallax), not color changes. This block:

- kills every color/opacity/box-shadow fade that aids comprehension (status dot crossfade, hover feedback, checkbox fill),
- freezes the processing `Spinner`s (`animation-iteration-count: 1` on an infinite rotation) — reduced-motion users lose the only "working on it" indicator,
- puts `scroll-behavior` on every element instead of `html` where it's set (`apps/web/app/globals.css:473`).

## Target

Replace the block (keep it in the same place, inside `@layer base`) with:

```css
@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto !important;
  }
  /*
     * Reduced motion, not zero motion: drop movement (transform, position),
     * keep the color/opacity/shadow feedback that aids comprehension.
     */
  *,
  *::before,
  *::after {
    transition-property:
      color, background-color, border-color, fill, stroke, opacity, box-shadow !important;
  }
  /* Entrance/exit keyframes (tw-animate-css) move elements — skip them. */
  .animate-in,
  .animate-out {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

How it works:

- Forcing `transition-property` to the safe list means elements that transition `transform`/`width`/`left` simply snap (those properties are no longer in the list), while their color/opacity/shadow transitions keep their authored durations.
- `animate-spin` (Spinner) and `animate-pulse` (skeletons — opacity-only) keep running: an in-place rotation of a 16px icon is state indication, not vestibular-triggering movement.
- `tw-animate-css` entrances (`animate-in`, e.g. the zoom Reset button's `slide-in-from-left-2`) are movement, so they're reduced to instant.

## Repo conventions to follow

- The block lives inside `@layer base` in `apps/web/app/globals.css`, exactly where the current one is (after the `button:focus` rules).
- Two-space indentation, CSS custom-property style matching the file.

## Steps

1. **`apps/web/app/globals.css`** — replace the entire current `@media (prefers-reduced-motion: reduce)` block (lines 499-508) with the target block above. Nothing else changes.

## Boundaries

- Do NOT touch `scroll-behavior: smooth` on `html` (line 473) — the media query override handles it.
- Do NOT edit any component files.
- If the current block doesn't match verbatim (drift since commit a322df8), STOP and report instead of improvising.

## Verification

- **Mechanical**: `cd apps/web && bun run typecheck` passes; `bun run check` at the repo root passes; `bun run build` in `apps/web` compiles the CSS without warnings.
- **Feel check**: `bun run dev`, DevTools → Rendering → emulate `prefers-reduced-motion: reduce`:
  - Drop images: the processing Spinner still rotates.
  - Hover the status pill and a queue item: background fades still animate.
  - Change API status / job completion: dot and badge colors still crossfade.
  - Zoom in past 100%: the Reset button appears instantly (no slide), and wheel-zoom position changes snap instead of gliding.
  - Turn emulation off: everything animates as before.
- **Done when**: with reduced motion emulated, nothing translates or scales over time, but spinners spin and color/opacity feedback remains.
