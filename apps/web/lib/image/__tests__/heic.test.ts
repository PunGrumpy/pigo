import { afterAll, beforeAll, describe, expect, it, jest } from "bun:test";

import { decodeHeic } from "../heic";

class FakeWorker {
  static created: FakeWorker[] = [];
  static failToStart = false;
  onmessage: ((event: { data: Blob | string }) => void) | null = null;
  onerror: ((event: { message: string }) => void) | null = null;
  posted: File[] = [];
  terminated = false;

  constructor() {
    if (FakeWorker.failToStart) {
      throw new Error("Worker blocked");
    }
    FakeWorker.created.push(this);
  }

  postMessage(file: File) {
    this.posted.push(file);
  }

  terminate() {
    this.terminated = true;
  }

  reply(data: Blob | string) {
    this.onmessage?.({ data });
  }
}

const workerAt = (index: number): FakeWorker => {
  const worker = FakeWorker.created[index];
  if (!worker) {
    throw new Error(`expected worker ${index}`);
  }
  return worker;
};

const workerWith = (name: string): FakeWorker => {
  const worker = FakeWorker.created.find((candidate) =>
    candidate.posted.some((file) => file.name === name)
  );
  if (!worker) {
    throw new Error(`expected a worker to receive ${name}`);
  }
  return worker;
};

const heicFile = (name: string) =>
  new File(["heic"], name, { type: "image/heic" });

const jpeg = () => new Blob(["jpeg"], { type: "image/jpeg" });

const postedNames = (worker: FakeWorker) =>
  worker.posted.map((file) => file.name);

const flush = () =>
  // oxlint-disable-next-line promise/avoid-new
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

const original = {
  OffscreenCanvas: globalThis.OffscreenCanvas,
  Worker: globalThis.Worker,
};

beforeAll(() => {
  globalThis.Worker = FakeWorker as unknown as typeof Worker;
  // decodeHeic only checks that some OffscreenCanvas constructor exists.
  globalThis.OffscreenCanvas = Object as unknown as typeof OffscreenCanvas;
});

afterAll(() => {
  globalThis.Worker = original.Worker;
  globalThis.OffscreenCanvas = original.OffscreenCanvas;
});

describe("decodeHeic", () => {
  it("decodes in at most three workers and reuses each one", async () => {
    const names = ["a", "b", "c", "d", "e"];
    const decoded = names.map((name) => decodeHeic(heicFile(`${name}.heic`)));
    await flush();

    expect(FakeWorker.created.map(postedNames)).toEqual([
      ["a.heic"],
      ["b.heic"],
      ["c.heic"],
    ]);

    workerAt(2).reply(jpeg());
    await flush();
    expect(postedNames(workerAt(2))).toEqual(["c.heic", "d.heic"]);

    for (const index of [0, 1, 2, 0]) {
      workerAt(index).reply(jpeg());
      // oxlint-disable-next-line no-await-in-loop
      await flush();
    }

    const files = await Promise.all(decoded);
    expect(files.map((file) => file.name)).toEqual(
      names.map((name) => `${name}.jpg`)
    );
    expect(files.every((file) => file.type === "image/jpeg")).toBe(true);
    expect(FakeWorker.created).toHaveLength(3);
  });

  it("rejects with the worker's error and terminates that worker", async () => {
    const decoded = decodeHeic(heicFile("broken.heic"));
    await flush();
    const failing = workerWith("broken.heic");
    failing.reply("Error: HEIF image not found");

    await expect(decoded).rejects.toThrow("HEIF image not found");
    expect(failing.terminated).toBe(true);
  });

  it("terminates idle workers once the queue has been quiet", async () => {
    const decoded = decodeHeic(heicFile("last.heic"));
    await flush();
    jest.useFakeTimers();
    try {
      workerWith("last.heic").reply(jpeg());
      await decoded;
      const live = FakeWorker.created.filter((worker) => !worker.terminated);
      expect(live.length).toBeGreaterThan(0);

      jest.advanceTimersByTime(9999);
      expect(live.some((worker) => worker.terminated)).toBe(false);

      jest.advanceTimersByTime(1);
      expect(live.every((worker) => worker.terminated)).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  it("frees the slot when a worker cannot start", async () => {
    FakeWorker.failToStart = true;
    try {
      const results = await Promise.allSettled(
        ["w", "x", "y", "z"].map((name) => decodeHeic(heicFile(`${name}.heic`)))
      );
      expect(results.map((result) => result.status)).toEqual([
        "rejected",
        "rejected",
        "rejected",
        "rejected",
      ]);
    } finally {
      FakeWorker.failToStart = false;
    }
  });

  it("keeps idle workers in WebKit, which leaks a terminated worker's child", async () => {
    const vendor = Object.getOwnPropertyDescriptor(navigator, "vendor");
    Object.defineProperty(navigator, "vendor", {
      configurable: true,
      value: "Apple Computer, Inc.",
    });
    const decoded = decodeHeic(heicFile("safari.heic"));
    await flush();
    jest.useFakeTimers();
    try {
      const worker = workerWith("safari.heic");
      worker.reply(jpeg());
      await decoded;

      jest.advanceTimersByTime(60_000);
      expect(worker.terminated).toBe(false);
    } finally {
      jest.useRealTimers();
      if (vendor) {
        Object.defineProperty(navigator, "vendor", vendor);
      } else {
        delete (navigator as { vendor?: string }).vendor;
      }
    }
  });
});
