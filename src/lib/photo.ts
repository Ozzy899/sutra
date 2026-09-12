const MAX_EDGE = 1024;
const TARGET_BYTES = 380_000;
const HARD_MAX_CHARS = 700_000;

export function sanitizePhotoDataUrl(raw: unknown): string | undefined {
  if (typeof raw !== "string" || raw.length > HARD_MAX_CHARS) return undefined;
  if (!/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=\s]+$/i.test(raw)) {
    return undefined;
  }
  return raw;
}

/** Profile without the data URL — safe to stringify for Grok or logs. */
export function profileWithoutPhoto<T extends { photoDataUrl?: string }>(
  profile: T,
): Omit<T, "photoDataUrl"> {
  const rest = { ...profile };
  delete rest.photoDataUrl;
  return rest;
}

export async function compressPortrait(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose a photo (JPEG, PNG, or WebP).");
  }
  const bitmap = await loadBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read that photo.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  if ("close" in bitmap && typeof bitmap.close === "function") bitmap.close();

  for (const quality of [0.82, 0.7, 0.58, 0.45]) {
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (dataUrl.length <= TARGET_BYTES * 1.37) return dataUrl;
  }
  const last = canvas.toDataURL("image/jpeg", 0.38);
  if (last.length > HARD_MAX_CHARS) {
    throw new Error("That photo is still too large after compress. Try a tighter crop.");
  }
  return last;
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file);
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that photo."));
    };
    img.src = url;
  });
}
