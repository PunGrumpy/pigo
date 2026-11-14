const MIN_QUALITY = 1;
const MAX_QUALITY = 100;
// A fit this close to the target is what the user asked for; more probes would
// only buy a few bytes.
const CLOSE_ENOUGH = 0.9;

export interface TargetSizeMatch {
  blob: Blob;
  // Integer quality, 1 to 100, that produced the blob.
  quality: number;
  // True when no quality fit and the blob is the smallest one seen.
  overTarget: boolean;
}

/**
 * Finds the highest integer quality whose output fits `targetBytes`, and stops
 * early at the first fit that is at least 90% of the target.
 *
 * Size does not fall strictly with quality, so the search keeps the best fit
 * and never assumes the last probe is the answer. When nothing fits, the
 * smallest blob wins.
 */
export const searchQualityForTarget = async (
  encode: (quality: number) => Promise<Blob>,
  targetBytes: number
): Promise<TargetSizeMatch> => {
  let low = MIN_QUALITY;
  let high = MAX_QUALITY;
  let fit: { blob: Blob; quality: number } | null = null;
  let smallest: { blob: Blob; quality: number } | null = null;

  while (low <= high) {
    const quality = Math.floor((low + high) / 2);
    // Each probe depends on the one before it, so they cannot run together.
    // oxlint-disable-next-line no-await-in-loop
    const blob = await encode(quality);

    if (blob.size <= targetBytes) {
      fit = { blob, quality };
      if (blob.size >= targetBytes * CLOSE_ENOUGH) {
        break;
      }
      low = quality + 1;
    } else {
      if (!smallest || blob.size < smallest.blob.size) {
        smallest = { blob, quality };
      }
      high = quality - 1;
    }
  }

  if (fit) {
    return { ...fit, overTarget: false };
  }
  if (!smallest) {
    throw new Error("The quality search did not encode anything.");
  }
  return { ...smallest, overTarget: true };
};
