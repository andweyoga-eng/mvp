/** Max dimension for admin image uploads (session types, QR codes, etc.). */
export const ADMIN_IMAGE_MAX_DIM = 1200;
/** Max base64 payload before server JSON limit (~1 MB raw). */
export const ADMIN_IMAGE_MAX_BASE64 = 900_000;
export const ADMIN_IMAGE_MAX_FILE_BYTES = 2 * 1024 * 1024;

export function validateAdminImageFile(file: File): string | null {
  if (!file.type.startsWith("image/")) return "Please choose an image file (JPEG, PNG, or WebP).";
  if (file.size > ADMIN_IMAGE_MAX_FILE_BYTES) {
    return `Image must be ${ADMIN_IMAGE_MAX_FILE_BYTES / (1024 * 1024)} MB or smaller.`;
  }
  return null;
}

/** Resize and compress so base64 JSON stays under the server body limit. */
export function compressImageForUpload(
  file: File,
  maxDim = ADMIN_IMAGE_MAX_DIM,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not process image"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      const encode = (quality: number) => canvas.toDataURL("image/jpeg", quality);
      let quality = 0.85;
      let dataUrl = encode(quality);
      while (dataUrl.length > ADMIN_IMAGE_MAX_BASE64 && quality > 0.45) {
        quality -= 0.1;
        dataUrl = encode(quality);
      }
      if (dataUrl.length > ADMIN_IMAGE_MAX_BASE64) {
        reject(new Error("Image is too large after compression. Try a smaller file."));
        return;
      }
      resolve(dataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image file"));
    };
    img.src = url;
  });
}
