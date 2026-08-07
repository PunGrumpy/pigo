# 003 — Scope `transition-all` to the properties that actually change

- **Status**: DONE
- **Commit**: a322df8
- **Severity**: MEDIUM
- **Category**: Performance
- **Estimated scope**: 3 files, ~5 class-string edits

## Problem

`transition-all` animates every animatable property, including ones the author never intended (layout properties, font-weight on a variable font), and runs off the compositor. Four components use it where only colors, backgrounds, or shadows actually change:

```tsx
/* apps/web/components/status.tsx:72 — current (container; only hover bg changes) */
transition-all duration-200 ease-[ease]
```

```tsx
/* apps/web/components/status.tsx:75 — current (dot; bg + glow shadow change) */
"status-dot shrink-0 inline-block size-2.5 rounded-full transition-all duration-300",
```

```tsx
/* apps/web/components/status.tsx:86 — current (text; only color changes) */
"status-text text-copy-14 geist-ellipsis font-mono font-medium uppercase text-[12px] transition-all duration-300",
```

```tsx
/* apps/web/components/ui/checkbox.tsx:41 — current (bg, border, focus shadow change) */
"relative inline-flex size-4 rotate-[0.000001deg] items-center justify-center rounded-sm border border-gray-700 bg-background-100 transition-all duration-200",
```

```tsx
/* apps/web/components/social.tsx:35 — current (svg paths; only fill changes) */
"[&_svg_path]:transition-all transition-[background,border-color] duration-200 hover:bg-gray-300 hover:border-gray-300 hover:[&_svg_path]:fill-gray-1000",
```

(`optimizer-controls-panel.tsx:119` and `optimizer-queue-panel.tsx:122` also use `transition-all` — those lines are owned by plans 002 and 004; do not touch them here.)

## Target

Each transition lists exactly the properties that change. Durations stay as they are except the checkbox, which drops to 150ms (state-toggle feedback belongs in the 100–160ms budget).

## Repo conventions to follow

- Exemplar already in the repo: `apps/web/components/optimizer-top-bar.tsx:92` uses `transition-[box-shadow,color] duration-200`.
- Tailwind arbitrary transition lists use CSS property names: `transition-[background-color,box-shadow]`.

## Steps

1. **`apps/web/components/status.tsx:72`** — in the container div's className, change `transition-all duration-200 ease-[ease]` to `transition-colors duration-200 ease-[ease]`.

2. **`apps/web/components/status.tsx:75`** — change

   ```tsx
   "status-dot shrink-0 inline-block size-2.5 rounded-full transition-all duration-300",
   ```

   to

   ```tsx
   "status-dot shrink-0 inline-block size-2.5 rounded-full transition-[background-color,box-shadow] duration-300",
   ```

3. **`apps/web/components/status.tsx:86`** — change `transition-all duration-300` to `transition-colors duration-300` in the status-text className.

4. **`apps/web/components/ui/checkbox.tsx:41`** — change

   ```tsx
   "relative inline-flex size-4 rotate-[0.000001deg] items-center justify-center rounded-sm border border-gray-700 bg-background-100 transition-all duration-200",
   ```

   to

   ```tsx
   "relative inline-flex size-4 rotate-[0.000001deg] items-center justify-center rounded-sm border border-gray-700 bg-background-100 transition-[background-color,border-color,box-shadow] duration-150",
   ```

5. **`apps/web/components/social.tsx:35`** — change `[&_svg_path]:transition-all` to `[&_svg_path]:transition-[fill]` (leave the rest of the string untouched).

## Boundaries

- Do NOT touch `optimizer-controls-panel.tsx` or `optimizer-queue-panel.tsx` (owned by plans 002 and 004).
- Do NOT change any duration except the checkbox's 200 → 150.
- Do NOT change colors, sizes, or markup — transition utilities only.
- If a class string doesn't match verbatim (drift since commit a322df8), STOP and report instead of improvising.

## Verification

- **Mechanical**: `cd apps/web && bun run typecheck` passes; `bun run check` at the repo root passes.
- **Feel check**: `bun run dev`, then:
  - Hover the status pill (bottom-left): background still fades in ~200ms.
  - Kill/restart the API (or let the health check fail) so the dot changes state: dot color and glow still crossfade over 300ms.
  - Toggle "Resize Image": the checkbox fill/border still fade, now snappier (150ms); tab to it and confirm the focus ring shadow still transitions.
  - Hover a social icon: the icon fill still fades with the background.
- **Done when**: no `transition-all` remains in these three files and all hover/state fades still visibly animate.
