import type { ImageLoaderProps } from "next/image";

const CLOUDINARY_UPLOAD = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;

/**
 * next/image loader. Cloudinary URLs get resized and converted on Cloudinary's CDN
 * (fast, and it doesn't use Vercel's image quota). Any other URL, such as local
 * Django /media/ during development or static files in /public, is returned unchanged.
 */
export default function cloudinaryLoader({ src, width, quality }: ImageLoaderProps): string {
  const match = CLOUDINARY_UPLOAD.exec(src);
  if (!match) {
    return src;
  }
  const [, base, rest] = match;
  const transforms = ["f_auto", `q_${quality ?? "auto"}`, "c_limit", `w_${width}`].join(",");
  return `${base}${transforms}/${rest}`;
}
