const MAX_SIDE = 1280;

export interface PreparedImage {
  base64: string;
  mimeType: "image/jpeg";
  previewUrl: string;
}

/**
 * Downscales a photo and re-encodes it as JPEG. Smaller images keep the on-device model
 * within its token limit and make cloud calls faster.
 */
export async function prepareImage(file: Blob): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return {
    base64: dataUrl.split(",")[1] ?? "",
    mimeType: "image/jpeg",
    previewUrl: dataUrl,
  };
}
