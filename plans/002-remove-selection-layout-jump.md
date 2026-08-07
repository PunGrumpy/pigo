# 002 — Remove the layout jump on queue-item and format-button selection

- **Status**: DONE
- **Commit**: a322df8
- **Severity**: HIGH
- **Category**: Craft / state-change jump (Physicality)
- **Estimated scope**: 2 files, ~10 lines changed

## Problem

The two highest-frequency clicks in the app both visibly jiggle:

1. **Queue item selection** (`apps/web/components/optimizer-queue-item.tsx:28-36`) adds a `border` only when selected. With `box-sizing: border-box` the 1px border eats into the padding, so the row's content nudges 1px inward on every selection. The filename also flips `font-normal → font-semibold`, shifting the text width and the truncation point.

```tsx
/* apps/web/components/optimizer-queue-item.tsx:28-36 — current */
    <button
      className={cn(
        "flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-left transition-colors duration-150 outline-none",
        "hover:bg-gray-200 active:bg-gray-300",
        selected &&
          "bg-gray-200 text-gray-1000 font-semibold border border-gray-alpha-400"
      )}
```

```tsx
/* apps/web/components/optimizer-queue-item.tsx:50-56 — current */
          className={cn(
            "block truncate text-label-13 leading-tight",
            selected
              ? "text-gray-1000 font-semibold"
              : "text-gray-900 font-normal"
          )}
```

2. **Format segmented control** (`apps/web/components/optimizer-controls-panel.tsx:117-123`) flips `font-medium → font-semibold` on the active segment. Geist is a variable font, so under the accompanying `transition-all` the weight visibly morphs and the label width shifts. The active `shadow-2xs` also isn't covered once `transition-all` is scoped.

```tsx
/* apps/web/components/optimizer-controls-panel.tsx:117-123 — current */
                    className={cn(
                      "h-8 rounded-md text-[11px] font-medium transition-all duration-150 outline-none uppercase select-none cursor-pointer",
                      isActive
                        ? "bg-background-100 text-gray-1000 shadow-2xs font-semibold"
                        : "text-gray-800 hover:text-gray-1000"
                    )}
```

## Target

Selection communicates through **color, background, and border-color only** — properties that don't affect layout. Font weight is constant per element. The unselected state always renders a transparent border so the selected border changes color instead of appearing.

## Repo conventions to follow

- Class merging via `cn` from `@/lib/utils` (already imported in both files).
- Scoped transition utilities are the repo's better pattern — exemplar: `apps/web/components/optimizer-top-bar.tsx:92` uses `transition-[box-shadow,color] duration-200`.

## Steps

1. **`apps/web/components/optimizer-queue-item.tsx`** — replace the button classes (current lines 29-34) with:

   ```tsx
   ("flex w-full items-center gap-2.5 rounded-[6px] border border-transparent px-2.5 py-2 text-left transition-colors duration-150 outline-none",
     "hover:bg-gray-200 active:bg-gray-300",
     selected && "bg-gray-200 text-gray-1000 border-gray-alpha-400");
   ```

   (Border is always present; `font-semibold` is removed from the button.)

2. Same file — replace the `strong` classes (current lines 51-55) with a constant weight:

   ```tsx
          className={cn(
            "block truncate text-label-13 font-medium leading-tight",
            selected ? "text-gray-1000" : "text-gray-900"
          )}
   ```

3. **`apps/web/components/optimizer-controls-panel.tsx`** — replace the format button classes (current lines 118-123) with:

   ```tsx
   ("h-8 rounded-md text-[11px] font-medium transition-[color,background-color,box-shadow] duration-150 outline-none uppercase select-none cursor-pointer",
     isActive
       ? "bg-background-100 text-gray-1000 shadow-2xs"
       : "text-gray-800 hover:text-gray-1000");
   ```

   (`transition-all` → scoped list including `box-shadow` so the active segment's shadow fades instead of popping; `font-semibold` removed.)

## Boundaries

- Do NOT touch `OptimizerStatusBadge` or any other component.
- Do NOT change markup/structure — class strings only.
- Do NOT change spacing (`px-2.5 py-2`, `gap-2.5`) or radii.
- If a class string doesn't match verbatim (drift since commit a322df8), STOP and report instead of improvising.

## Verification

- **Mechanical**: `cd apps/web && bun run typecheck` passes; `bun run check` at the repo root passes.
- **Feel check**: `bun run dev`, add 3+ images, then:
  - Click between queue items while watching a filename: the text must not shift horizontally or vertically by even 1px (zoom the browser to 200% to check). Only colors change.
  - Click through Same/JPEG/PNG/WebP: labels stay pixel-stable; the active background and shadow fade in over 150ms; no text-weight morph.
  - DevTools → Animations panel at 10% speed: only `color`, `background-color`, `border-color`, `box-shadow` transition — nothing layout-affecting.
- **Done when**: selection anywhere in the queue and segmented control is layout-stable and typecheck/lint are clean.
