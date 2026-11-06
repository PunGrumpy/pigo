import { afterEach, beforeEach, describe, expect, it } from "bun:test";

import { act, renderHook } from "@testing-library/react";

import { useCompareSlider } from "@/hooks/use-compare-slider";
import type { ImageJob, ImageResult } from "@/lib/image/types";

const makeResult = (url: string): ImageResult => ({
  blob: new Blob(["result"]),
  elapsedMs: 5,
  height: 100,
  outputFormat: "jpeg",
  settingsKey: url,
  size: 500,
  url,
  width: 100,
});

const makeJob = (result?: ImageResult): ImageJob => ({
  file: new File(["data"], "a.jpg", { type: "image/jpeg" }),
  height: 100,
  id: "job-1",
  inputFormat: "jpeg",
  name: "a.jpg",
  originalSize: 4,
  originalUrl: "blob:original",
  result,
  slider: 50,
  status: result ? "done" : "processing",
  thumbnailUrl: null,
  width: 100,
});

const REVEAL_END_MS = 1000;

const noop = () => {};

let frames: FrameRequestCallback[] = [];
let requested = 0;
const realRequest = globalThis.requestAnimationFrame;
const realCancel = globalThis.cancelAnimationFrame;

// Runs the queued frame callbacks, at the start and then past the sweep's end.
const runSweep = () => {
  for (const timestamp of [0, REVEAL_END_MS]) {
    const pending = frames;
    frames = [];
    for (const frame of pending) {
      frame(timestamp);
    }
  }
};

beforeEach(() => {
  frames = [];
  requested = 0;
  globalThis.requestAnimationFrame = (frame) => {
    frames.push(frame);
    requested += 1;
    return requested;
  };
  globalThis.cancelAnimationFrame = () => {
    frames = [];
  };
});

afterEach(() => {
  globalThis.requestAnimationFrame = realRequest;
  globalThis.cancelAnimationFrame = realCancel;
});

describe("useCompareSlider", () => {
  it("sweeps once when the first result arrives", () => {
    const { rerender } = renderHook(({ job }) => useCompareSlider(job, noop), {
      initialProps: { job: makeJob() },
    });
    expect(requested).toBe(0);

    rerender({ job: makeJob(makeResult("blob:a")) });
    expect(requested).toBe(1);
    act(() => {
      runSweep();
    });
  });

  it("does not sweep or move the divider when the result URL changes", () => {
    const { rerender, result } = renderHook(
      ({ job }) => useCompareSlider(job, noop),
      { initialProps: { job: makeJob(makeResult("blob:a")) } }
    );
    act(() => {
      runSweep();
    });
    act(() => {
      result.current.setSlider(80);
    });
    const requestedBefore = requested;

    rerender({ job: makeJob(makeResult("blob:b")) });
    act(() => {
      runSweep();
    });

    expect(requested).toBe(requestedBefore);
    expect(result.current.slider).toBe(80);
  });

  it("does not sweep again when a result returns after a failed rerun", () => {
    const { rerender } = renderHook(({ job }) => useCompareSlider(job, noop), {
      initialProps: { job: makeJob(makeResult("blob:a")) },
    });
    act(() => {
      runSweep();
    });
    const requestedBefore = requested;

    rerender({ job: makeJob() });
    rerender({ job: makeJob(makeResult("blob:b")) });

    expect(requested).toBe(requestedBefore);
  });
});
