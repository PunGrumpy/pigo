# 001 — Make the compare-slider reveal local, cancelable, and reduced-motion aware

- **Status**: DONE
- **Commit**: a322df8
- **Severity**: HIGH
- **Category**: Performance / Interruptibility
- **Estimated scope**: 1 file (`apps/web/components/optimizer-preview.tsx`), ~60 lines changed

## Problem

When a compression result arrives, an 800ms "reveal" animates the before/after slider from 0% to 50%. The current implementation drives it through a `requestAnimationFrame` loop that calls `onSliderChange` **every frame**. That prop routes to `updateJob` on the optimizer context, so the entire provider subtree (queue panel, controls panel, top bar, preview) re-renders at 60fps for 800ms — worst exactly when many jobs just finished. The loop is also never cancelled: there is no `cancelAnimationFrame` anywhere, so it keeps writing to the job after unmount, job removal, or job switch, and if the user grabs the slider during the reveal the loop fights their drag frame by frame. It also ignores `prefers-reduced-motion`.

```tsx
/* apps/web/components/optimizer-preview.tsx:243-275 — current */
// Micro-animation on load
useEffect(() => {
  if (job.result && lastResultUrlRef.current !== job.result.url) {
    lastResultUrlRef.current = job.result.url;

    let start: number | null = null;
    // Duration of animation: 800ms
    const duration = 800;
    const initialValue = 0;
    const targetValue = 50;

    const animate = (timestamp: number) => {
      if (!start) {
        start = timestamp;
      }
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function: easeOutQuart
      const ease = 1 - (1 - progress) ** 4;
      const nextValue = initialValue + (targetValue - initialValue) * ease;

      onSliderChange(job, Math.round(nextValue));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    onSliderChange(job, initialValue);
    requestAnimationFrame(animate);
  }
}, [job, onSliderChange]);
```

## Target

- The context is written **once** per reveal (`onSliderChange(job, 50)` at the start). The visual sweep is driven by a **component-local** state value (`revealSlider`), so per-frame re-renders are confined to the preview.
- The rAF id is stored in a ref; the loop is cancelled on unmount, on a new reveal starting, and the moment the user touches the viewport or the range input (the display then snaps to the committed value / pointer position — correct interrupt behavior).
- `prefers-reduced-motion: reduce` skips the sweep entirely: slider jumps to 50 with no animation.
- Duration stays **800ms** with **easeOutQuart** (`1 - (1 - t) ** 4`). This is explanatory motion (it teaches the compare affordance), so it is exempt from the sub-300ms UI budget — do not shorten it.
- Behavior parity note: like today, switching between completed jobs replays the reveal. Keep that; do not "fix" it in this plan.

## Repo conventions to follow

- Component-local UI state via `useState`/`useRef` at the top of the component — see `isPanning` / `startPanRef` in this same file (`apps/web/components/optimizer-preview.tsx:236-241`).
- `cn` from `@/lib/utils` for class merging; no new dependencies.

## Steps

1. **`apps/web/components/optimizer-preview.tsx`** — in `OptimizerPreview`, add reveal state/refs next to the existing state (after line 241) and a cancel helper:

   ```tsx
   const rafIdRef = useRef<number | null>(null);
   const [revealSlider, setRevealSlider] = useState<number | null>(null);

   const cancelReveal = useCallback(() => {
     if (rafIdRef.current !== null) {
       cancelAnimationFrame(rafIdRef.current);
       rafIdRef.current = null;
     }
     setRevealSlider(null);
   }, []);
   ```

2. Replace the whole `// Micro-animation on load` effect (current lines 243-275, including the `lastResultUrlRef` declaration, which is no longer needed) with latest-ref mirrors plus a single effect keyed on the result URL. The cleanup cancels the loop on unmount, on job/result switches, and lets analyzers see the rAF loop is cancelled in the same effect:

   ```tsx
   // Latest-ref mirrors so the reveal effect can key off the result URL alone —
   // depending on `job`/`onSliderChange` would cancel the sweep on every
   // unrelated context update (their identities change each render).
   const jobRef = useRef(job);
   const onSliderChangeRef = useRef(onSliderChange);
   useEffect(() => {
     jobRef.current = job;
     onSliderChangeRef.current = onSliderChange;
   });

   const resultUrl = job.result?.url ?? null;

   // Reveal sweep when a new result arrives. Explanatory motion: 800ms easeOutQuart.
   useEffect(() => {
     if (!resultUrl) {
       return;
     }

     // Commit the final value once; the sweep itself stays local.
     onSliderChangeRef.current(jobRef.current, 50);

     let rafId: number;

     if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
       rafId = requestAnimationFrame(() => {
         rafIdRef.current = null;
         setRevealSlider(null);
       });
     } else {
       let start: number | null = null;
       const duration = 800;
       const targetValue = 50;

       const animate = (timestamp: number) => {
         if (!start) {
           start = timestamp;
         }
         const progress = Math.min((timestamp - start) / duration, 1);
         const ease = 1 - (1 - progress) ** 4;

         if (progress < 1) {
           setRevealSlider(targetValue * ease);
           rafId = requestAnimationFrame(animate);
           rafIdRef.current = rafId;
         } else {
           setRevealSlider(null);
           rafIdRef.current = null;
         }
       };

       rafId = requestAnimationFrame(animate);
     }

     rafIdRef.current = rafId;

     return () => {
       cancelAnimationFrame(rafId);
       rafIdRef.current = null;
     };
   }, [resultUrl]);
   ```

3. Derive the displayed value right after the effects and pass it down. Add to `OptimizerPreview` body:

   ```tsx
   const displaySlider = revealSlider ?? job.slider;
   ```

   Add a `sliderValue: number` prop to `ComparisonViewportProps` and pass `sliderValue={displaySlider}` from `OptimizerPreview`. Inside `ComparisonViewport`, replace the three render-time uses of `job.slider` with `sliderValue`:
   - line 152: `clipPath: `inset(0 ${100 - sliderValue}% 0 0)``
   - line 183: `style={{ left: `${sliderValue}%` }}` (divider line)
   - line 193: `style={{ left: `${sliderValue}%` }}` (divider handle)

   Leave `job.slider` as-is inside `onComparePointerDown` (line 344) — the committed value is already 50 during the reveal and pointer-down cancels it.

   Also render the animating value in the percent readout (line ~439): `{job.slider}%` → `{Math.round(displaySlider)}%`.

   Note: all `setRevealSlider` calls live inside rAF callbacks, never synchronously in the effect body — the repo's react-compiler lint (`EffectSetState`) forbids synchronous setState in effects.

4. Interrupt on user input:
   - First line of `onComparePointerDown` (before the `job.result` guard): `cancelReveal();`
   - In the bottom `<input type="range">` (current line 444-455): change `value={job.slider}` to `value={Math.round(displaySlider)}` and make `onChange`:

     ```tsx
     onChange={(event) => {
       cancelReveal();
       onSliderChange(job, Number(event.target.value));
     }}
     ```

## Boundaries

- Do NOT touch any other file — `optimizer-provider.tsx`, `use-optimizer.ts`, and `optimizer-preview-panel.tsx` stay unchanged.
- Do NOT change the 800ms duration or the easeOutQuart curve.
- Do NOT add new dependencies.
- If the code at the cited lines doesn't match (drift since commit a322df8), STOP and report instead of improvising.

## Verification

- **Mechanical**: `cd apps/web && bun run typecheck` passes; `bun run check` at the repo root passes.
- **Feel check**: `bun run dev`, open http://localhost:3000, drop an image:
  - When the result arrives, the divider sweeps 0% → 50% over ~0.8s, decelerating (fast start, gentle landing).
  - Grab the divider (or the range input) _during_ the sweep: it stops immediately and follows the pointer with zero fighting or jitter.
  - React DevTools Profiler during the sweep: only `OptimizerPreview` and its children re-render per frame — the queue panel and controls panel do not.
  - DevTools → Rendering → emulate `prefers-reduced-motion: reduce`, drop another image: the slider appears at 50% instantly, no sweep.
  - Remove the image mid-sweep: no console errors, no stray state writes.
- **Done when**: all feel checks pass and typecheck/lint are clean.
