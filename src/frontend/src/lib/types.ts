import type { CropAdjust, Message, SiteContent, StoredFile } from "@/backend";

export type { CropAdjust, Message, SiteContent, StoredFile };

/**
 * Object URLs are expensive to create and must be reused for the same byte
 * payload. React Query's structural sharing keeps the same `Uint8Array`
 * reference across refetches when the blob has not changed, so a WeakMap keyed
 * by the byte array gives us a stable display URL without leaking one per
 * render.
 */
const objectUrlCache = new WeakMap<Uint8Array, string>();

/** Sniffs the common image container formats from their magic bytes. */
function sniffImageMime(bytes: Uint8Array): string {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46
  ) {
    return "image/gif";
  }
  if (
    bytes.length >= 12 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return "image/jpeg";
}

/**
 * Turns raw backend bytes into a displayable object URL. The regenerated
 * bindings map `StoredFile` to `Uint8Array`, so the backend returns raw bytes
 * with no URL; the browser needs an object URL to render them.
 */
export function blobToDisplayUrl(
  bytes: Uint8Array | null | undefined,
  kind: "image" | "audio" = "image",
): string | null {
  if (!bytes || bytes.length === 0) return null;
  const cached = objectUrlCache.get(bytes);
  if (cached) return cached;
  const type = kind === "audio" ? "audio/mpeg" : sniffImageMime(bytes);
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type }));
  objectUrlCache.set(bytes, url);
  return url;
}

/** The neutral framing: fit the whole photo, no pan, no rotation. */
export const DEFAULT_CROP: CropAdjust = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
};

/** True when a crop is the untouched default framing. */
export function isDefaultCrop(crop: CropAdjust): boolean {
  return (
    Math.abs(crop.zoom - 1) < 0.001 &&
    Math.abs(crop.offsetX) < 0.001 &&
    Math.abs(crop.offsetY) < 0.001 &&
    Math.abs(crop.rotation) < 0.001
  );
}

/**
 * The CSS transform that renders a saved crop inside a fixed-shape frame.
 * `offsetX`/`offsetY` are fractions of the frame size, so the same values
 * reproduce the framing at any rendered size. `object-cover` already fills the
 * frame, so the offsets are expressed as a percentage of the frame itself.
 */
export function cropToTransform(crop: CropAdjust | undefined): string {
  const value = crop ?? DEFAULT_CROP;
  return `translate(${value.offsetX * 100}%, ${value.offsetY * 100}%) scale(${value.zoom}) rotate(${value.rotation}deg)`;
}

/** A message paired with a resolved display photo URL and its raw bytes. */
export interface ResolvedMessage {
  id: bigint;
  text: string;
  /** Object URL for rendering, or null when the message has no photo. */
  photoUrl: string | null;
  /** Raw bytes, kept so edits and reorders can re-send the existing photo. */
  photoBytes: Uint8Array | null;
  /** Saved crop/adjust parameters, or null when the photo is unframed. */
  crop: CropAdjust | null;
  position: number;
}

/** Site content with every optional photo resolved to a displayable URL. */
export interface ResolvedSiteContent {
  headline: string;
  subtext: string;
  heroPhotoUrl: string | null;
  /** Saved crop/adjust parameters for the hero photo. */
  heroCrop: CropAdjust | null;
  songUrl: string | null;
  messages: ResolvedMessage[];
}

/** A single editable message row inside the owner panel. */
export interface MessageDraft {
  id: bigint;
  text: string;
  photoUrl: string | null;
  photoBytes: Uint8Array | null;
  crop: CropAdjust | null;
  position: number;
}
