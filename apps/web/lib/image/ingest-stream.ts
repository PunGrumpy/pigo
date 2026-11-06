import { MAX_CONCURRENT_JOBS, runWithConcurrency } from "@/lib/compress/pool";
import { inputFormatOf } from "@/lib/image/format";
import { revokeJobUrls } from "@/lib/image/revoke";
import type { ImageJob, InputFormat } from "@/lib/image/types";
import { validateFile } from "@/lib/image/validation";

export interface IngestHandlers {
  /** Called in drop order, once the job and every job before it are ready. */
  onJob: (job: ImageJob) => void;
  onMessage: (message: string) => void;
  /** Called once per input file, after its job or message was delivered. */
  onSettled: () => void;
  isCancelled: () => boolean;
}

export type LoadJob = (
  file: File,
  inputFormat: InputFormat
) => Promise<ImageJob | string>;

interface AcceptedFile {
  file: File;
  inputFormat: InputFormat;
}

const acceptFiles = (
  files: File[],
  startCount: number,
  messages: string[]
): AcceptedFile[] => {
  const accepted: AcceptedFile[] = [];
  let count = startCount;

  for (const file of files) {
    const validationError = validateFile(file, count);
    if (validationError) {
      messages.push(validationError);
      continue;
    }

    const inputFormat = inputFormatOf(file);
    if (!inputFormat) {
      messages.push(`${file.name} is not a supported image.`);
      continue;
    }

    accepted.push({ file, inputFormat });
    count += 1;
  }

  return accepted;
};

export const streamIngest = async (
  files: File[],
  startCount: number,
  handlers: IngestHandlers,
  loadJob: LoadJob
): Promise<void> => {
  const { isCancelled, onJob, onMessage, onSettled } = handlers;

  const rejections: string[] = [];
  const accepted = acceptFiles(files, startCount, rejections);
  for (const message of rejections) {
    if (!isCancelled()) {
      onMessage(message);
    }
  }
  for (let rejected = accepted.length; rejected < files.length; rejected += 1) {
    onSettled();
  }

  const outcomes: (ImageJob | string | undefined)[] = Array.from({
    length: accepted.length,
  });
  let cursor = 0;

  // Rows appear in drop order: a finished file waits for the ones before it.
  const deliverContiguous = () => {
    while (cursor < outcomes.length) {
      const outcome = outcomes[cursor];
      if (outcome === undefined) {
        return;
      }
      cursor += 1;

      if (isCancelled()) {
        if (typeof outcome !== "string") {
          revokeJobUrls(outcome);
        }
      } else if (typeof outcome === "string") {
        onMessage(outcome);
      } else {
        onJob(outcome);
      }
      onSettled();
    }
  };

  await runWithConcurrency(
    accepted.map((entry, index) => ({ entry, index })),
    MAX_CONCURRENT_JOBS,
    async ({ entry, index }) => {
      outcomes[index] = await loadJob(entry.file, entry.inputFormat);
      deliverContiguous();
    }
  );
};
