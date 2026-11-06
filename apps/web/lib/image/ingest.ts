import { readPreview } from "@/lib/compress/browser";
import { parseJpegExif } from "@/lib/image/exif";
import { decodeHeic } from "@/lib/image/heic";
import { streamIngest } from "@/lib/image/ingest-stream";
import type { IngestHandlers } from "@/lib/image/ingest-stream";
import type { ImageJob, InputFormat } from "@/lib/image/types";
import { validateDimensions } from "@/lib/image/validation";

const jobFromFile = async (
  file: File,
  inputFormat: InputFormat
): Promise<ImageJob | string> => {
  try {
    const source = inputFormat === "heic" ? await decodeHeic(file) : file;
    const preview = await readPreview(source);
    const dimensionError = validateDimensions(
      preview.width,
      preview.height,
      file.name
    );
    if (dimensionError) {
      if (preview.thumbnailUrl) {
        URL.revokeObjectURL(preview.thumbnailUrl);
      }
      return dimensionError;
    }

    const exif = inputFormat === "jpeg" ? await parseJpegExif(file) : null;

    return {
      exif,
      file: source,
      height: preview.height,
      id: crypto.randomUUID(),
      inputFormat,
      name: file.name,
      originalSize: file.size,
      originalUrl: URL.createObjectURL(source),
      slider: 50,
      status: "queued",
      thumbnailUrl: preview.thumbnailUrl,
      width: preview.width,
    };
  } catch {
    return inputFormat === "heic"
      ? `${file.name} could not be decoded as HEIC.`
      : `${file.name} could not be decoded by the browser.`;
  }
};

export const ingestFiles = (
  files: File[],
  startCount: number,
  handlers: IngestHandlers
): Promise<void> => streamIngest(files, startCount, handlers, jobFromFile);
