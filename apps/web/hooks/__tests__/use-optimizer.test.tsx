import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
  mock,
  spyOn,
} from "bun:test";

import { act, renderHook, waitFor } from "@testing-library/react";

// Captured before mock.module runs below, so the mocked browser module can
// still re-export the real readPreview/targetDimensions. mock.module replaces
// the shared module registry entry for the whole test run, not just this
// file, and other suites (e.g. browser.test.ts) import the same file and need
// those real exports to keep working.
import { readPreview, targetDimensions } from "@/lib/compress/browser";
import type {
  CompressionOptions,
  ImageJob,
  ImageResult,
} from "@/lib/image/types";

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

const createDeferred = <T,>(): Deferred<T> => {
  let resolveFn!: (value: T) => void;
  let rejectFn!: (reason: unknown) => void;
  // oxlint-disable-next-line promise/avoid-new
  const promise = new Promise<T>((resolve, reject) => {
    resolveFn = resolve;
    rejectFn = reject;
  });
  return { promise, reject: rejectFn, resolve: resolveFn };
};

interface CompressCall {
  job: ImageJob;
  options: CompressionOptions;
  deferred: Deferred<ImageResult>;
  signal?: AbortSignal;
}

// Populated in call order by both compress mocks below; tests resolve/reject
// by index to control exactly when a given job's "compression" finishes.
let compressCalls: CompressCall[] = [];
let jobCounter = 0;

const compressWithApiMock = mock(
  (job: ImageJob, options: CompressionOptions, signal?: AbortSignal) => {
    const deferred = createDeferred<ImageResult>();
    compressCalls.push({ deferred, job, options, signal });
    return deferred.promise;
  }
);

const compressWithBrowserMock = mock(
  (job: ImageJob, options: CompressionOptions) => {
    const deferred = createDeferred<ImageResult>();
    compressCalls.push({ deferred, job, options });
    return deferred.promise;
  }
);

const makeFakeJob = (file: File): ImageJob => {
  const id = `job-${jobCounter}`;
  jobCounter += 1;
  return {
    file,
    height: 100,
    id,
    inputFormat: "jpeg",
    name: file.name,
    originalSize: file.size,
    originalUrl: `blob:original-${id}`,
    slider: 50,
    status: "queued",
    thumbnailUrl: null,
    width: 100,
  };
};

const ingestFilesMock = mock((files: File[]) =>
  Promise.resolve({
    jobs: files.map(makeFakeJob),
    messages: [],
  })
);

mock.module("@/lib/compress/api", () => ({
  compressWithApi: compressWithApiMock,
}));

mock.module("@/lib/compress/browser", () => ({
  compressWithBrowser: compressWithBrowserMock,
  readPreview,
  targetDimensions,
}));

mock.module("@/lib/image/ingest", () => ({
  ingestFiles: ingestFilesMock,
}));

const { useOptimizer } = await import("@/hooks/use-optimizer");

let resultUrlCounter = 0;

const makeResult = (overrides: Partial<ImageResult> = {}): ImageResult => {
  resultUrlCounter += 1;
  return {
    blob: new Blob(["result"]),
    elapsedMs: 5,
    height: 100,
    outputFormat: "jpeg",
    size: 500,
    url: `blob:result-${resultUrlCounter}`,
    width: 100,
    ...overrides,
  };
};

const firstJob = (jobs: ImageJob[]): ImageJob => {
  const [job] = jobs;
  if (!job) {
    throw new Error("expected at least one job");
  }
  return job;
};

const makeFile = (name: string) =>
  new File(["data"], name, { type: "image/jpeg" });

beforeEach(() => {
  compressCalls = [];
  jobCounter = 0;
  resultUrlCounter = 0;
});

// mock.module patches the shared module registry for the whole test run, not
// just this file, so restore it here so other suites (e.g. browser.test.ts)
// see the real @/lib/compress/browser and @/lib/compress/api exports again.
afterAll(() => {
  mock.restore();
});

describe("useOptimizer", () => {
  it("commits results for every job added in a batch", async () => {
    const { result } = renderHook(() => useOptimizer());

    await act(async () => {
      await result.current.actions.addFiles([
        makeFile("a.jpg"),
        makeFile("b.jpg"),
      ]);
    });

    expect(result.current.state.jobs).toHaveLength(2);
    expect(
      result.current.state.jobs.every((job) => job.status === "processing")
    ).toBe(true);
    expect(compressCalls).toHaveLength(2);

    await act(async () => {
      compressCalls[0]?.deferred.resolve(makeResult());
      compressCalls[1]?.deferred.resolve(makeResult());
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(
        result.current.state.jobs.every((job) => job.status === "done")
      ).toBe(true);
    });
    expect(result.current.state.processPercent).toBe(100);
  });

  it("discards a superseded run and revokes its result URL instead of committing it", async () => {
    const { result } = renderHook(() => useOptimizer());
    const revokeSpy = spyOn(URL, "revokeObjectURL");

    await act(async () => {
      await result.current.actions.addFiles([makeFile("a.jpg")]);
    });
    expect(compressCalls).toHaveLength(1);

    await act(() => {
      result.current.actions.applyOptions();
    });
    expect(compressCalls).toHaveLength(2);
    expect(compressCalls[0]?.signal?.aborted).toBe(true);

    const staleResult = makeResult({ url: "blob:stale-result" });
    await act(async () => {
      compressCalls[0]?.deferred.resolve(staleResult);
      await Promise.resolve();
    });

    expect(firstJob(result.current.state.jobs).status).not.toBe("done");
    expect(revokeSpy.mock.calls.map((call) => call[0])).toContain(
      "blob:stale-result"
    );

    const freshResult = makeResult({ url: "blob:fresh-result" });
    await act(async () => {
      compressCalls[1]?.deferred.resolve(freshResult);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(firstJob(result.current.state.jobs).status).toBe("done");
    });
    expect(firstJob(result.current.state.jobs).result?.url).toBe(
      "blob:fresh-result"
    );

    revokeSpy.mockRestore();
  });

  it("drops an in-flight result for a job removed before it resolves", async () => {
    const { result } = renderHook(() => useOptimizer());
    const revokeSpy = spyOn(URL, "revokeObjectURL");

    await act(async () => {
      await result.current.actions.addFiles([makeFile("a.jpg")]);
    });
    const jobId = firstJob(result.current.state.jobs).id;
    expect(compressCalls).toHaveLength(1);

    await act(() => {
      result.current.actions.removeJob(jobId);
    });
    expect(result.current.state.jobs).toHaveLength(0);
    expect(compressCalls[0]?.signal?.aborted).toBe(true);

    const staleResult = makeResult({ url: "blob:removed-result" });
    await act(async () => {
      compressCalls[0]?.deferred.resolve(staleResult);
      await Promise.resolve();
    });

    expect(result.current.state.jobs).toHaveLength(0);
    expect(revokeSpy.mock.calls.map((call) => call[0])).toContain(
      "blob:removed-result"
    );

    revokeSpy.mockRestore();
  });

  it("revokes every job's URLs on unmount", async () => {
    const { result, unmount } = renderHook(() => useOptimizer());
    const revokeSpy = spyOn(URL, "revokeObjectURL");

    await act(async () => {
      await result.current.actions.addFiles([
        makeFile("a.jpg"),
        makeFile("b.jpg"),
      ]);
    });

    await act(async () => {
      compressCalls[0]?.deferred.resolve(makeResult({ url: "blob:done-a" }));
      compressCalls[1]?.deferred.resolve(makeResult({ url: "blob:done-b" }));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(
        result.current.state.jobs.every((job) => job.status === "done")
      ).toBe(true);
    });

    const jobsBeforeUnmount = result.current.state.jobs;
    revokeSpy.mockClear();

    unmount();

    const revokedUrls = revokeSpy.mock.calls.map((call) => call[0]);
    for (const job of jobsBeforeUnmount) {
      const resultUrl = job.result?.url;
      if (!resultUrl) {
        throw new Error(`expected job ${job.id} to have a result`);
      }
      expect(revokedUrls).toContain(job.originalUrl);
      expect(revokedUrls).toContain(resultUrl);
    }

    revokeSpy.mockRestore();
  });

  it("debounces a quality-only patch before re-running the queue", async () => {
    const { result } = renderHook(() => useOptimizer());

    await act(async () => {
      await result.current.actions.addFiles([makeFile("a.jpg")]);
    });
    await act(async () => {
      compressCalls[0]?.deferred.resolve(makeResult());
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(firstJob(result.current.state.jobs).status).toBe("done");
    });

    const callsBeforePatch = compressCalls.length;

    jest.useFakeTimers();
    try {
      act(() => {
        result.current.actions.patchOptions({ quality: 50 });
      });
      expect(compressCalls).toHaveLength(callsBeforePatch);

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(compressCalls.length).toBeGreaterThan(callsBeforePatch);
    } finally {
      jest.useRealTimers();
    }
  });
});
