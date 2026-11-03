const EXTENSION = /\.[^/.]+$/u;
const HEIC_JPEG_QUALITY = 0.95;

export const decodeHeic = async (file: File): Promise<File> => {
  const { heicTo } = await import("heic-to");
  const blob = await heicTo({
    blob: file,
    quality: HEIC_JPEG_QUALITY,
    type: "image/jpeg",
  });
  return new File([blob], file.name.replace(EXTENSION, ".jpg"), {
    type: "image/jpeg",
  });
};
