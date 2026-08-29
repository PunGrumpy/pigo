// Compression is expensive on both paths: the API path holds a whole multipart
// body in memory per request, and the browser path pins a full-size canvas.
// Fanning out an entire 50-image queue at once starves both. Four keeps the
// network pipe and the encoder busy without either becoming the bottleneck.
export const MAX_CONCURRENT_JOBS = 4;

/**
 * Runs `task` over `items` with at most `limit` in flight at a time, preserving
 * start order. `task` must not reject — a rejection aborts the whole batch.
 */
export const runWithConcurrency = async <T>(
  items: readonly T[],
  limit: number,
  task: (item: T) => Promise<void>
): Promise<void> => {
  let cursor = 0;

  const worker = async (): Promise<void> => {
    while (cursor < items.length) {
      const item = items[cursor];
      cursor += 1;
      // Sequential by design: this worker holds one slot of the limit, and the
      // parallelism comes from running several workers, not from batching here.
      // oxlint-disable-next-line no-await-in-loop
      await task(item);
    }
  };

  const workers: Promise<void>[] = [];
  for (let index = 0; index < Math.min(limit, items.length); index += 1) {
    workers.push(worker());
  }

  await Promise.all(workers);
};
