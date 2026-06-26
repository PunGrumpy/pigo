import { readDimensions } from "@/lib/compress/browser";
import { formatFromMime } from "@/lib/image/format";
import type { ImageFormat, ImageJob } from "@/lib/image/types";
import { validateDimensions, validateFile } from "@/lib/image/validation";

interface IngestResult {
  jobs: ImageJob[];
  messages: string[];
}

interface AcceptedFile {
  file: File;
  inputFormat: ImageFormat;
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

    const inputFormat = formatFromMime(file.type);
    if (!inputFormat) {
      messages.push(`${file.name} is not a supported image.`);
      continue;
    }

    accepted.push({ file, inputFormat });
    count += 1;
  }

  return accepted;
};

const jobFromFile = async (
  file: File,
  inputFormat: ImageFormat
): Promise<ImageJob | string> => {
  try {
    const dimensions = await readDimensions(file);
    const dimensionError = validateDimensions(
      dimensions.width,
      dimensions.height,
      file.name
    );
    if (dimensionError) {
      return dimensionError;
    }

    return {
      file,
      height: dimensions.height,
      id: crypto.randomUUID(),
      inputFormat,
      name: file.name,
      originalSize: file.size,
      originalUrl: URL.createObjectURL(file),
      slider: 50,
      status: "queued",
      width: dimensions.width,
    };
  } catch {
    return `${file.name} could not be decoded by the browser.`;
  }
};

export const ingestFiles = async (
  files: File[],
  startCount: number
): Promise<IngestResult> => {
  const messages: string[] = [];
  const accepted = acceptFiles(files, startCount, messages);
  const outcomes = await Promise.all(
    accepted.map(({ file, inputFormat }) => jobFromFile(file, inputFormat))
  );

  const jobs: ImageJob[] = [];
  for (const outcome of outcomes) {
    if (typeof outcome === "string") {
      messages.push(outcome);
      continue;
    }
    jobs.push(outcome);
  }

  return { jobs, messages };
};
