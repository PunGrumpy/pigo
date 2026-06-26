import { buildDownloadName } from "@/lib/image/format";
import type { ImageJob } from "@/lib/image/types";

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
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

export const downloadAll = async (jobs: ImageJob[]) => {
  const ready = jobs.filter((job) => job.result);
  if (ready.length === 0) {
    return;
  }
  if (ready.length === 1) {
    downloadJob(ready[0]);
    return;
  }

  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  for (const job of ready) {
    const { result } = job;
    if (!result) {
      continue;
    }
    zip.file(buildDownloadName(job.name, result.outputFormat), result.blob);
  }
  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, "pigo-images.zip");
};
