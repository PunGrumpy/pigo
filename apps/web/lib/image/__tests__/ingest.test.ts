import { afterAll, describe, expect, it, mock } from "bun:test";

import { MAX_CONCURRENT_JOBS } from "@/lib/compress/pool";

const nextTick = (ms = 0) =>
  // oxlint-disable-next-line promise/avoid-new
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

let inFlight = 0;
let maxInFlight = 0;

// Delay by file name so completion order can differ from start order; the
// index-based outcomes array in ingestFiles must still return jobs in input
// order regardless of which decode finishes first.
const delayForName = (name: string) => (name === "slow.jpg" ? 20 : 0);

const readPreviewMock = mock(async (file: File) => {
  inFlight += 1;
  maxInFlight = Math.max(maxInFlight, inFlight);
  await nextTick(delayForName(file.name));
  inFlight -= 1;
  return { height: 100, thumbnailUrl: null, width: 100 };
});

mock.module("@/lib/compress/browser", () => ({
  readPreview: readPreviewMock,
}));

const { ingestFiles } = await import("../ingest");

// mock.module patches the shared module registry for the whole test run, not
// just this file, so restore it here so other suites (e.g. browser.test.ts)
// see the real @/lib/compress/browser exports again.
afterAll(() => {
  mock.restore();
});

const makeFile = (name: string) =>
  new File(["data"], name, { type: "image/jpeg" });

describe("ingestFiles", () => {
  it("never decodes more than MAX_CONCURRENT_JOBS files at once", async () => {
    inFlight = 0;
    maxInFlight = 0;
    const files = Array.from({ length: 10 }, (_, index) =>
      makeFile(`file-${index}.jpg`)
    );

    await ingestFiles(files, 0);

    expect(maxInFlight).toBeLessThanOrEqual(MAX_CONCURRENT_JOBS);
  });

  it("returns jobs in input order even when a later file decodes first", async () => {
    const files = [
      makeFile("slow.jpg"),
      makeFile("fast-a.jpg"),
      makeFile("fast-b.jpg"),
    ];

    const { jobs } = await ingestFiles(files, 0);

    expect(jobs.map((job) => job.name)).toEqual([
      "slow.jpg",
      "fast-a.jpg",
      "fast-b.jpg",
    ]);
  });
});
