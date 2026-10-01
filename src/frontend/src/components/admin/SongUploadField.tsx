import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ExternalBlob } from "@caffeineai/object-storage";
import { Loader2, Music, RefreshCw } from "lucide-react";
import { useId, useRef, useState } from "react";

interface SongUploadFieldProps {
  /** Current song URL, or null when no song has been uploaded yet. */
  currentUrl: string | null;
  /**
   * Called with the uploaded song's display URL and raw audio bytes. Return the
   * caller's mutation promise so the progress bar stays visible until the
   * upload actually settles.
   */
  onUploaded: (url: string, bytes: Uint8Array) => void | Promise<void>;
  /** Called when the upload fails, with a human-readable reason. */
  onError: (message: string) => void;
}

/**
 * Owner-only background-song picker with upload progress. Uploads the chosen
 * audio file to platform object storage and hands the display URL back to the
 * caller, which persists it through the backend.
 */
export function SongUploadField({
  currentUrl,
  onUploaded,
  onError,
}: SongUploadFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const isUploading = progress !== null;

  const handleChange = async (file: File | undefined) => {
    if (!file) return;
    setProgress(0);
    setFileName(file.name);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const blob = ExternalBlob.fromBytes(bytes, file.type, file.name);
      blob.withUploadProgress((percentage) => setProgress(percentage));
      // Hand the raw bytes to the caller; the backend mutation carries them to
      // platform object storage. Await the caller's mutation so the progress
      // bar reflects the real upload and only clears once it settles.
      await onUploaded(blob.getDirectURL(), bytes);
    } catch {
      onError("Could not read that audio file. Try a different file.");
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary">
          <Music className="h-6 w-6 text-accent" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor={inputId}>Background song</Label>
          <p className="truncate text-xs text-muted-foreground">
            {fileName
              ? fileName
              : currentUrl
                ? "A song is set and plays across the site."
                : "No song yet — upload one to play across the site."}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              id={inputId}
              data-ocid="owner.song.input"
              type="file"
              accept="audio/*"
              className="sr-only"
              onChange={(event) => void handleChange(event.target.files?.[0])}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              data-ocid="owner.song.upload_button"
              disabled={isUploading}
              onClick={() => inputRef.current?.click()}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : currentUrl ? (
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Music className="h-4 w-4" aria-hidden="true" />
              )}
              {isUploading
                ? "Uploading…"
                : currentUrl
                  ? "Replace song"
                  : "Upload song"}
            </Button>
          </div>
        </div>
      </div>

      {isUploading ? (
        <div data-ocid="owner.song.progress" className="space-y-1">
          <Progress value={progress ?? 0} />
          <p className="text-xs text-muted-foreground">
            Uploading… {Math.round(progress ?? 0)}%
          </p>
        </div>
      ) : null}
    </div>
  );
}
