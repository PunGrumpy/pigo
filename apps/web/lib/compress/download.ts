import { buildDownloadName } from "@/lib/image/format";
import type { ImageJob } from "@/lib/image/types";

const EXTENSION_PATTERN = /\.[^/.]+$/u;
const REVOKE_DELAY_MS = 60_000;

export const zipEntryNames = (names: readonly string[]): string[] => {
  const used = new Set<string>();
  const nextCounter = new Map<string, number>();
  const result: string[] = [];

  for (const name of names) {
    if (!used.has(name)) {
      used.add(name);
      result.push(name);
      continue;
    }

    const extensionMatch = name.match(EXTENSION_PATTERN);
    const extension = extensionMatch ? extensionMatch[0] : "";
    const basename = extension ? name.slice(0, -extension.length) : name;

    let counter = nextCounter.get(name) ?? 2;
    let candidate = `${basename} (${counter})${extension}`;
    while (used.has(candidate)) {
      counter += 1;
      candidate = `${basename} (${counter})${extension}`;
    }
    nextCounter.set(name, counter + 1);

    used.add(candidate);
    result.push(candidate);
  }

  return result;
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
};

export const downloadJob = (job: ImageJob) => {
  if (!job.result) {
    return;
  }
  downloadBlob(
    job.result.blob,
    buildDownloadName(job.name, job.result.outputFormat)
  );
};

export const downloadAll = async (
  jobs: ImageJob[],
  onProgress?: (percent: number) => void
) => {
  const ready = jobs.filter((job) => job.result);
  if (ready.length === 0) {
    return;
  }
  if (ready.length === 1) {
    downloadJob(ready[0]);
    return;
  }

  const entries: { blob: Blob; name: string }[] = [];
  for (const job of ready) {
    const { result } = job;
    if (!result) {
      continue;
    }
    entries.push({
      blob: result.blob,
      name: buildDownloadName(job.name, result.outputFormat),
    });
  }
  const uniqueNames = zipEntryNames(entries.map((entry) => entry.name));

  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  for (const [index, entry] of entries.entries()) {
    zip.file(uniqueNames[index], entry.blob);
  }

  const blob = await zip.generateAsync({ type: "blob" }, (metadata) => {
    if (onProgress) {
      onProgress(Math.round(metadata.percent));
    }
  });

  const [dateStr] = new Date().toISOString().split("T");
  downloadBlob(blob, `pigo-images-${dateStr}.zip`);
};
