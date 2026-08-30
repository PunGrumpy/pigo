import { describe, expect, it } from "bun:test";

import { runWithConcurrency } from "../pool";

const nextTick = () =>
  // oxlint-disable-next-line promise/avoid-new
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

describe("runWithConcurrency", () => {
  it("never runs more than `limit` tasks at once", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    let ranCount = 0;
    const items = Array.from({ length: 10 }, (_, index) => index);

    await runWithConcurrency(items, 3, async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await nextTick();
      ranCount += 1;
      inFlight -= 1;
    });

    expect(maxInFlight).toBeLessThanOrEqual(3);
    expect(ranCount).toBe(10);
  });

  it("preserves start order", async () => {
    const started: number[] = [];
    const items = [0, 1, 2, 3, 4, 5];

    await runWithConcurrency(items, 3, async (item) => {
      started.push(item);
      await nextTick();
    });

    expect(started).toEqual(items);
  });

  it("runs all items when there are fewer items than the limit", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    let ranCount = 0;
    const items = [0, 1];

    await runWithConcurrency(items, 4, async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await nextTick();
      ranCount += 1;
      inFlight -= 1;
    });

    expect(ranCount).toBe(2);
    expect(maxInFlight).toBeLessThanOrEqual(2);
  });

  // Characterizes the documented contract: a rejecting task aborts the whole
  // batch rather than being contained per-item. This is not a bug fix target.
  it("rejects the whole batch when a task rejects", () => {
    const items = [0, 1, 2];

    const run = runWithConcurrency(items, 2, async (item) => {
      await nextTick();
      if (item === 1) {
        throw new Error("task failed");
      }
    });

    expect(run).rejects.toThrow("task failed");
  });
});
