import { describe, expect, it } from "bun:test";

import { searchQualityForTarget } from "../target-size";

const KB = 1024;

// Fake encoder: size in bytes for each quality, recording every probe.
const fakeEncoder = (sizeAt: (quality: number) => number) => {
  const probes: number[] = [];
  const encode = (quality: number) => {
    probes.push(quality);
    return Promise.resolve(new Blob([new Uint8Array(sizeAt(quality))]));
  };
  return { encode, probes };
};

describe("searchQualityForTarget", () => {
  it("returns the highest quality that fits when no fit comes close", async () => {
    // Sizes jump from 30 KB at quality 60 to 200 KB above it, so no fit
    // reaches 90% of the 100 KB target and the search runs to the end.
    const { encode } = fakeEncoder((quality) =>
      quality <= 60 ? quality * 0.5 * KB : 200 * KB
    );
    const match = await searchQualityForTarget(encode, 100 * KB);

    expect(match.quality).toBe(60);
    expect(match.blob.size).toBe(30 * KB);
    expect(match.overTarget).toBe(false);
  });

  it("stops at the first fit within 90% of the target", async () => {
    const { encode, probes } = fakeEncoder((quality) => quality * KB);
    const match = await searchQualityForTarget(encode, 60 * KB);

    // 50 fits but is only 83%, 75 and 62 are over, 56 is 93% and ends it.
    expect(probes).toEqual([50, 75, 62, 56]);
    expect(match.quality).toBe(56);
    expect(match.overTarget).toBe(false);
  });

  it("stops after one probe when the first one is close enough", async () => {
    const { encode, probes } = fakeEncoder((quality) => quality * KB);
    const match = await searchQualityForTarget(encode, 52 * KB);

    expect(probes).toEqual([50]);
    expect(match.quality).toBe(50);
  });

  it("keeps quality 100 when it already fits", async () => {
    const { encode } = fakeEncoder((quality) => quality * KB);
    const match = await searchQualityForTarget(encode, 500 * KB);

    expect(match.quality).toBe(100);
    expect(match.overTarget).toBe(false);
  });

  it("keeps quality 1 when only quality 1 fits", async () => {
    const { encode } = fakeEncoder((quality) => quality * KB);
    const match = await searchQualityForTarget(encode, KB);

    expect(match.quality).toBe(1);
    expect(match.overTarget).toBe(false);
  });

  it("probes about log2(100) qualities", async () => {
    const { encode, probes } = fakeEncoder((quality) => quality * KB);
    await searchQualityForTarget(encode, 37 * KB);

    expect(probes.length).toBeLessThanOrEqual(7);
    expect(new Set(probes).size).toBe(probes.length);
  });

  it("returns the smallest blob and flags it when nothing fits", async () => {
    const { encode } = fakeEncoder((quality) => (quality + 10) * KB);
    const match = await searchQualityForTarget(encode, 5 * KB);

    expect(match.overTarget).toBe(true);
    expect(match.quality).toBe(1);
    expect(match.blob.size).toBe(11 * KB);
  });

  it("returns the smallest blob seen when the curve is not monotonic", async () => {
    // Quality 3 is larger than quality 6, so the smallest is not at 1.
    const sizes = new Map([
      [1, 30],
      [3, 40],
      [6, 20],
      [12, 50],
      [25, 60],
      [50, 70],
    ]);
    const { encode } = fakeEncoder(
      (quality) => (sizes.get(quality) ?? 80) * KB
    );
    const match = await searchQualityForTarget(encode, 10 * KB);

    expect(match.overTarget).toBe(true);
    expect(match.quality).toBe(6);
    expect(match.blob.size).toBe(20 * KB);
  });

  it("keeps the best fit when a later probe does not fit", async () => {
    // Quality 75 fits only by luck; 87 jumps back above the target. The answer
    // is the fit, not the last probe.
    const { encode, probes } = fakeEncoder((quality) => {
      if (quality === 75) {
        return 80 * KB;
      }
      return quality < 75 ? quality * KB : 150 * KB;
    });
    const match = await searchQualityForTarget(encode, 100 * KB);

    expect(probes.at(-1)).not.toBe(match.quality);
    expect(match.quality).toBe(75);
    expect(match.blob.size).toBe(80 * KB);
    expect(match.overTarget).toBe(false);
  });

  it("propagates an encoder failure", async () => {
    await expect(
      searchQualityForTarget(
        () => Promise.reject(new Error("This browser could not encode webp.")),
        KB
      )
    ).rejects.toThrow("This browser could not encode webp.");
  });
});
