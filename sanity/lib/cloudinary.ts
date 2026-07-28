import type { ImageRef } from "@/lib/types";
import { CLOUDINARY_CLOUD_NAME } from "@/lib/env";

/* Cloudinary is the media library; Sanity stores only a reference to it.
 *
 * sanity-plugin-cloudinary writes a `cloudinary.asset` object onto the document
 * when an editor picks an image inside the Studio. It carries public_id, format,
 * intrinsic width/height and a secure_url. We keep the dimensions (they are what
 * make layout shift impossible) and rebuild the URL ourselves, because the
 * stored secure_url has no transformations in it. */

export type CloudinaryAsset = {
  _type?: string;
  public_id?: string;
  secure_url?: string;
  format?: string;
  width?: number;
  height?: number;
  resource_type?: string;
};

type UrlOptions = {
  /** Cap the delivered width. Next's optimizer produces the responsive set from
   *  whatever it is given, so this is a ceiling, not the render size. */
  width?: number;
  /** Crop to an exact box — used only for OG images, where 1200×630 is fixed. */
  height?: number;
};

/**
 * Build a delivery URL for a Cloudinary public_id.
 *
 * On double optimisation: Next's own image optimizer still runs over these
 * (res.cloudinary.com is in next.config's remotePatterns), so Cloudinary is not
 * generating the responsive variants — Next is. That is deliberate. A custom
 * next/image `loader` cannot be passed from a Server Component, and switching
 * the whole app to a global loaderFile would take the LOCAL images (Deb, the
 * brand mark, the pre-Cloudinary covers) off the optimizer too. So Cloudinary
 * delivers one sensibly-capped, auto-formatted original and Next does the rest.
 * The extra encode happens once per image, at the edge, then caches.
 */
export function cloudinaryUrl(
  publicId: string,
  { width = 2000, height }: UrlOptions = {},
): string {
  if (!CLOUDINARY_CLOUD_NAME) return "";
  const transforms = [
    "f_auto",
    "q_auto:good",
    `w_${width}`,
    ...(height ? [`h_${height}`, "c_fill", "g_auto"] : ["c_limit"]),
  ].join(",");
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transforms}/${publicId}`;
}

/**
 * Normalise whatever the cover field holds into the one shape the app renders.
 *
 * This is the seam that lets the demo post ship a local /public image while
 * every later post comes from Cloudinary — without a union type in the schema
 * and without a single page component knowing the difference.
 *
 * Alt text is NOT read from Cloudinary's context metadata. It comes from a
 * required field the author fills in beside the image, because alt text
 * describes the image *in this context* and an asset reused across two posts
 * rarely deserves the same sentence twice.
 */
export function resolveCover(
  asset: CloudinaryAsset | null | undefined,
  alt: string | null | undefined,
): ImageRef | null {
  if (!asset?.public_id) return null;
  const src = cloudinaryUrl(asset.public_id);
  if (!src) return null;
  return {
    src,
    alt: alt?.trim() || "",
    /* Fall back to a 3:2 box only if Cloudinary somehow returned no intrinsic
     * size — never render an <Image> without dimensions, that is CLS by hand. */
    width: asset.width ?? 1200,
    height: asset.height ?? 800,
    publicId: asset.public_id,
  };
}

/** A local /public image, in the same shape. Used by content/ before Cloudinary. */
export function localImage(
  src: string,
  alt: string,
  width: number,
  height: number,
): ImageRef {
  return { src, alt, width, height };
}
