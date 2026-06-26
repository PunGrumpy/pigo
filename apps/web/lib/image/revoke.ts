import type { ImageJob } from "./types";

export const revokeJobUrls = (job: ImageJob) => {
  URL.revokeObjectURL(job.originalUrl);
  if (job.result?.url) {
    URL.revokeObjectURL(job.result.url);
  }
};
