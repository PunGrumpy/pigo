import { describe, expect, it, spyOn } from "bun:test";

import type {
  CompressionOptions,
  ImageJob,
  ImageResult,
} from "../../image/types";
import { encodeJob } from "../encode";
import type { Encoders } from "../encode";

const options: CompressionOptions = {
  maintainAspect: true,
  outputFormat: "same",
  quality: 82,
  resizeEnabled: false,
  resizeHeight: 0,
  resizeWidth: 0,
};

const ORIGINAL_SIZE = 1000;

const makeJob = (overrides: Partial<ImageJob> = {}): ImageJob => ({
  file: new File([new Uint8Array(ORIGINAL_SIZE)], "a.png", {
    type: "image/png",
  }),
  height: 100,
  id: "job-1",
  inputFormat: "png",
  name: "a.png",
  originalSize: ORIGINAL_SIZE,
  originalUrl: "blob:original",
  slider: 50,
  status: "queued",
  thumbnailUrl: null,
  width: 100,
  ...overrides,
});

const makeResult = (overrides: Partial<ImageResult> = {}): ImageResult => ({
  blob: new Blob(["encoded"], { type: "image/png" }),
  elapsedMs: 5,
  height: 100,
  outputFormat: "png",
  size: 500,
  url: "blob:encoded",
  width: 100,
  ...overrides,
});

const makeEncoders = (api: Encoders["api"], browser: Encoders["browser"]) => ({
  api,
  browser,
});

const rejectApi: Encoders["api"] = () =>
  Promise.reject(new Error("The server could not process this image."));

describe("encodeJob", () => {
  it("falls back to the browser when the API fails", async () => {
    const browserResult = makeResult({ url: "blob:browser" });
    const result = await encodeJob(
      makeJob(),
      options,
      new AbortController().signal,
      makeEncoders(rejectApi, () => Promise.resolve(browserResult))
    );

    expect(result).toBe(browserResult);
  });

  it("does not fall back when the job was aborted", async () => {
    const controller = new AbortController();
    const error = new DOMException("aborted", "AbortError");
    let browserCalls = 0;

    const api: Encoders["api"] = () => {
      controller.abort();
      return Promise.reject(error);
    };
    const browser: Encoders["browser"] = () => {
      browserCalls += 1;
      return Promise.resolve(makeResult());
    };

    await expect(
      encodeJob(
        makeJob(),
        options,
        controller.signal,
        makeEncoders(api, browser)
      )
    ).rejects.toBe(error);
    expect(browserCalls).toBe(0);
  });

  it("returns the original PNG when the encoded PNG is larger", async () => {
    const job = makeJob();
    const created = spyOn(URL, "createObjectURL").mockReturnValue("blob:kept");
    const revoked = spyOn(URL, "revokeObjectURL");

    const result = await encodeJob(
      job,
      options,
      new AbortController().signal,
      makeEncoders(
        () => Promise.resolve(makeResult({ size: ORIGINAL_SIZE + 1 })),
        () => Promise.reject(new Error("unused"))
      )
    );

    expect(result.blob).toBe(job.file);
    expect(result.size).toBe(ORIGINAL_SIZE);
    expect(result.url).toBe("blob:kept");
    expect(revoked).toHaveBeenCalledWith("blob:encoded");

    created.mockRestore();
    revoked.mockRestore();
  });

  it("returns the encoded PNG when it is smaller", async () => {
    const encoded = makeResult({ size: ORIGINAL_SIZE - 1 });
    const result = await encodeJob(
      makeJob(),
      options,
      new AbortController().signal,
      makeEncoders(
        () => Promise.resolve(encoded),
        () => Promise.reject(new Error("unused"))
      )
    );

    expect(result).toBe(encoded);
  });

  it("returns the encoded JPEG even when it is larger", async () => {
    const encoded = makeResult({
      outputFormat: "jpeg",
      size: ORIGINAL_SIZE + 1,
    });
    const result = await encodeJob(
      makeJob({ inputFormat: "jpeg" }),
      options,
      new AbortController().signal,
      makeEncoders(
        () => Promise.reject(new Error("unused")),
        () => Promise.resolve(encoded)
      )
    );

    expect(result).toBe(encoded);
  });
});
