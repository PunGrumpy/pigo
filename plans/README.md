# Animation Improvement Plans

Produced by an animation/motion audit of `apps/web` at commit `a322df8` (2026-08-07). Each plan is self-contained: an executor needs no context beyond the plan file itself.

| # | Plan | Severity | Status |
| --- | --- | --- | --- |
| 001 | [Cancelable, local compare-slider reveal](001-cancelable-local-slider-reveal.md) | HIGH | DONE |
| 002 | [Remove selection layout jump](002-remove-selection-layout-jump.md) | HIGH | DONE |
| 003 | [Scope `transition-all`](003-scope-transition-all.md) | MEDIUM | DONE |
| 004 | [Progress bar via `scaleX`](004-progress-bar-scalex.md) | MEDIUM | DONE |
| 005 | [Reduced motion keeps feedback](005-reduced-motion-keep-feedback.md) | MEDIUM | TODO |

## Recommended execution order

`001 → 002 → 003 → 004 → 005` (impact order). All five are independent in behavior, but file ownership is partitioned to avoid conflicts:

- Plan **002** owns `optimizer-controls-panel.tsx:119` (its `transition-all` is fixed there, not in 003).
- Plan **004** owns `optimizer-queue-panel.tsx:122` (same reason).
- Plan **005** should land after 003/004 conceptually (its safe-list approach assumes transitions are scoped), but does not conflict with them.

## Not planned (from the audit)

- LOW: motion tokens (`--ease-*`) consolidation; zoom Reset button keyframe entrance/exit.
- Missed opportunities: success-badge entrance, notice-banner entrance, queue item entrances, empty↔preview crossfade.
