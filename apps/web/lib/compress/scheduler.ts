export interface Scheduler<TOptions> {
  request: (id: string, options: TOptions) => void;
  cancel: (id: string) => void;
  cancelAll: () => void;
}

/**
 * One shared queue for every encode, so rows that arrive one at a time still
 * run at most `limit` at once. `run` must not reject: a rejection would leave
 * its slot held.
 *
 * `wanted` is the latest request per id and `running` is what is in flight.
 * A cancelled run keeps its slot until it settles, because a browser encode
 * cannot be interrupted.
 */
export const createScheduler = <TOptions>(
  limit: number,
  run: (id: string, options: TOptions, signal: AbortSignal) => Promise<void>
): Scheduler<TOptions> => {
  const wanted = new Map<string, TOptions>();
  const running = new Map<string, AbortController>();

  const settle = async (
    id: string,
    work: Promise<void>,
    onSettled: () => void
  ): Promise<void> => {
    try {
      await work;
    } finally {
      running.delete(id);
      onSettled();
    }
  };

  const pump = (): void => {
    for (const [id, options] of wanted) {
      if (running.size >= limit) {
        return;
      }
      if (running.has(id)) {
        continue;
      }

      wanted.delete(id);
      const controller = new AbortController();
      running.set(id, controller);
      void settle(id, run(id, options, controller.signal), pump);
    }
  };

  const cancel = (id: string): void => {
    wanted.delete(id);
    running.get(id)?.abort();
  };

  return {
    cancel,
    cancelAll: () => {
      wanted.clear();
      for (const controller of running.values()) {
        controller.abort();
      }
    },
    request: (id, options) => {
      wanted.set(id, options);
      running.get(id)?.abort();
      pump();
    },
  };
};
