import type { ImageJob } from "./types";

export const isJobPending = (job: Pick<ImageJob, "status">) =>
  job.status === "processing" || job.status === "queued";
