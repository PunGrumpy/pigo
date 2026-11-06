import { describe, expect, it } from "bun:test";

import { createScheduler } from "../scheduler";

interface Call {
  id: string;
  options: string;
  signal: AbortSignal;
  settle: () => void;
}

const setup = (limit: number) => {
  const calls: Call[] = [];
  let inFlight = 0;
  let maxInFlight = 0;

  const scheduler = createScheduler<string>(limit, (id, options, signal) => {
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    // oxlint-disable-next-line promise/avoid-new
    return new Promise<void>((resolve) => {
      calls.push({
        id,
        options,
        settle: () => {
          inFlight -= 1;
          resolve();
        },
        signal,
      });
    });
  });

  return { calls, maxInFlight: () => maxInFlight, scheduler };
};

const flush = () =>
  // oxlint-disable-next-line promise/avoid-new
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

const callAt = (calls: Call[], index: number): Call => {
  const call = calls[index];
  if (!call) {
    throw new Error(`expected call ${index}`);
  }
  return call;
};

describe("createScheduler", () => {
  it("never runs more than the limit at once and starts the next when a slot settles", async () => {
    const { calls, maxInFlight, scheduler } = setup(2);

    for (const id of ["a", "b", "c", "d"]) {
      scheduler.request(id, id);
    }
    expect(calls.map((call) => call.id)).toEqual(["a", "b"]);

    callAt(calls, 0).settle();
    await flush();
    expect(calls.map((call) => call.id)).toEqual(["a", "b", "c"]);

    callAt(calls, 1).settle();
    await flush();
    expect(calls.map((call) => call.id)).toEqual(["a", "b", "c", "d"]);
    expect(maxInFlight()).toBe(2);
  });

  it("aborts a running id on a second request and runs only the latest options after it settles", async () => {
    const { calls, scheduler } = setup(2);

    scheduler.request("a", "first");
    scheduler.request("a", "second");
    expect(calls).toHaveLength(1);
    expect(callAt(calls, 0).signal.aborted).toBe(true);

    callAt(calls, 0).settle();
    await flush();

    expect(calls).toHaveLength(2);
    expect(callAt(calls, 1).options).toBe("second");
    expect(callAt(calls, 1).signal.aborted).toBe(false);
  });

  it("coalesces requests made while an id is queued", async () => {
    const { calls, scheduler } = setup(1);

    scheduler.request("a", "a");
    scheduler.request("b", "old");
    scheduler.request("b", "new");

    callAt(calls, 0).settle();
    await flush();

    expect(calls.map((call) => call.options)).toEqual(["a", "new"]);
    callAt(calls, 1).settle();
    await flush();
    expect(calls).toHaveLength(2);
  });

  it("cancel drops queued work and aborts running work", async () => {
    const { calls, scheduler } = setup(1);

    scheduler.request("a", "a");
    scheduler.request("b", "b");
    scheduler.cancel("b");
    scheduler.cancel("a");
    expect(callAt(calls, 0).signal.aborted).toBe(true);

    callAt(calls, 0).settle();
    await flush();
    expect(calls).toHaveLength(1);
  });

  it("cancelAll clears every queued and running id", async () => {
    const { calls, scheduler } = setup(2);

    for (const id of ["a", "b", "c"]) {
      scheduler.request(id, id);
    }
    scheduler.cancelAll();
    expect(calls.every((call) => call.signal.aborted)).toBe(true);

    for (const call of calls) {
      call.settle();
    }
    await flush();
    expect(calls).toHaveLength(2);
  });

  it("keeps a cancelled run's slot until it settles", async () => {
    const { calls, scheduler } = setup(1);

    scheduler.request("a", "a");
    scheduler.cancel("a");
    scheduler.request("b", "b");
    expect(calls).toHaveLength(1);

    callAt(calls, 0).settle();
    await flush();
    expect(calls.map((call) => call.id)).toEqual(["a", "b"]);
  });
});
