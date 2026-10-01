import { CropEditor } from "@/components/admin/CropEditor";
import type { CropShape } from "@/components/admin/CropEditor";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { DEFAULT_CROP, cropToTransform } from "@/lib/types";
import type { CropAdjust } from "@/lib/types";
import { ExternalBlob } from "@caffeineai/object-storage";
import { Crop, ImagePlus, Loader2, RefreshCw } from "lucide-react";
import { useId, useRef, useState } from "react";

interface PhotoUploadFieldProps {
  /** Visible field label, e.g. "Hero photo". */
  label: string;
  /** Current display URL, or null when nothing has been uploaded yet. */
  currentUrl: string | null;
  /** Saved crop/adjust parameters for the current photo, or null. */
  currentCrop: CropAdjust | null;
  /** Frame shape the photo takes on the site: arch for hero, square for messages. */
  shape: CropShape;
  /**
   * Called with the file's display URL, raw bytes, and confirmed crop
   * adjustments. Return the caller's mutation promise so the progress bar stays
   * visible until the upload actually settles.
   */
  onUploaded: (
    url: string,
    bytes: Uint8Array,
    crop: CropAdjust,
  ) => void | Promise<void>;
  /**
   * Called with confirmed adjustments when the owner re-crops the photo that is
   * already saved. The bytes are unchanged, so only the crop is persisted.
   */
  onCropSaved: (crop: CropAdjust) => void | Promise<void>;
  /** Called when the upload fails, with a human-readable reason. */
  onError: (message: string) => void;
  /** `data-ocid` prefix, e.g. "owner.hero_photo". */
  ocid: string;
  /** Optional helper copy under the label. */
  hint?: string;
}

/**
 * Owner-only photo picker. Choosing a file opens a crop & adjust step before
 * anything is saved; the confirmed adjustments travel with the bytes to the
 * caller, which persists both. An already-cropped photo can be re-opened to
 * restore and refine its saved framing.
 */
export function PhotoUploadField({
  label,
  currentUrl,
  currentCrop,
  shape,
  onUploaded,
  onCropSaved,
  onError,
  ocid,
  hint,
}: PhotoUploadFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pending, setPending] = useState<{
    url: string;
    bytes: Uint8Array | null;
    crop: CropAdjust | null;
  } | null>(null);

  const isUploading = progress !== null;
  const shownUrl = previewUrl ?? currentUrl;
  // While a crop step is open, preview its in-progress adjustments; otherwise
  // show the crop the parent has saved (including right after a new upload,
  // when `pending` has been cleared but `previewUrl` still points at the file).
  const shownCrop = previewUrl && pending ? pending.crop : currentCrop;

  const handleChange = async (file: File | undefined) => {
    if (!file) return;
    setProgress(0);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const blob = ExternalBlob.fromBytes(bytes, file.type, file.name);
      blob.withUploadProgress((percentage) => setProgress(percentage));
      const url = blob.getDirectURL();
      setPreviewUrl(url);
      // A freshly chosen photo starts from the neutral framing; the owner
      // confirms or adjusts it in the crop step before it is saved.
      setPending({ url, bytes, crop: null });
    } catch {
      onError(`Could not read ${label.toLowerCase()}. Try a different file.`);
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleConfirmCrop = async (crop: CropAdjust) => {
    if (!pending) return;
    const { url, bytes } = pending;
    setPending(null);
    setProgress(0);
    try {
      if (bytes) {
        await onUploaded(url, bytes, crop);
      } else {
        await onCropSaved(crop);
      }
    } catch {
      onError(`Could not save ${label.toLowerCase()}. Try again.`);
    } finally {
      setProgress(null);
    }
  };

  const openCropForCurrent = () => {
    if (!currentUrl) return;
    setPending({ url: currentUrl, bytes: null, crop: currentCrop });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-secondary">
          {shownUrl ? (
            <img
              src={shownUrl}
              alt={`${label} preview`}
              className="h-full w-full object-cover"
              style={{ transform: cropToTransform(shownCrop ?? undefined) }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImagePlus
                className="h-6 w-6 text-muted-foreground"
                aria-hidden="true"
              />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor={inputId}>{label}</Label>
          {hint ? (
            <p className="text-xs text-muted-foreground">{hint}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              id={inputId}
              data-ocid={`${ocid}.input`}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => void handleChange(event.target.files?.[0])}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              data-ocid={`${ocid}.upload_button`}
              disabled={isUploading}
              onClick={() => inputRef.current?.click()}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : shownUrl ? (
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ImagePlus className="h-4 w-4" aria-hidden="true" />
              )}
              {isUploading
                ? "Uploading…"
                : shownUrl
                  ? "Replace photo"
                  : "Upload photo"}
            </Button>
            {currentUrl ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                data-ocid={`${ocid}.crop_button`}
                disabled={isUploading}
                onClick={openCropForCurrent}
              >
                <Crop className="h-4 w-4" aria-hidden="true" />
                Crop &amp; adjust
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {isUploading ? (
        <div data-ocid={`${ocid}.progress`} className="space-y-1">
          <Progress value={progress ?? 0} />
          <p className="text-xs text-muted-foreground">
            Uploading… {Math.round(progress ?? 0)}%
          </p>
        </div>
      ) : null}

      {pending ? (
        <CropEditor
          imageUrl={pending.url}
          shape={shape}
          initialCrop={pending.crop}
          ocid={ocid}
          onConfirm={(crop) => void handleConfirmCrop(crop)}
          onCancel={() => setPending(null)}
        />
      ) : null}
    </div>
  );
}

export { DEFAULT_CROP };
