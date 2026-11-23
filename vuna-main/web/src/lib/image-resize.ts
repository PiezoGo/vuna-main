/** Longest side in pixels and target quality for uploaded produce photos. */
const MAX_SIDE = 1600;
const QUALITY = 0.82;

/**
 * Shrink a photo in the browser before upload: phone photos are often 4–8 MB, which is
 * slow on mobile data and over Vercel's 4.5 MB request limit. Returns a JPEG File.
 * Falls back to the original file if the browser can't decode it.
 */
export async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY),
    );
    if (!blob || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } catch (error) {
    console.warn("[shrinkImage] keeping the original photo", error);
    return file;
  }
}
