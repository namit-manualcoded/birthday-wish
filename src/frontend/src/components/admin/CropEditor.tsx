import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { DEFAULT_CROP, cropToTransform } from "@/lib/types";
import type { CropAdjust } from "@/lib/types";
import { Check, RotateCcw, RotateCw, X, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/** The frame shape the photo will occupy on the public site. */
export type CropShape = "arch" | "square";

interface CropEditorProps {
  /** Object URL of the photo being adjusted. */
  imageUrl: string;
  /** Frame shape to preview: portrait arch for the hero, square for messages. */
  shape: CropShape;
  /** Saved adjustments to restore, or null for the untouched framing. */
  initialCrop: CropAdjust | null;
  /** Called with the confirmed adjustments when the owner saves. */
  onConfirm: (crop: CropAdjust) => void;
  /** Called when the owner cancels and discards the selection. */
  onCancel: () => void;
  /** `data-ocid` prefix, e.g. "owner.hero_photo". */
  ocid: string;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;
const ROTATE_STEP = 5;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Owner-only crop & adjust step. Opens after a photo is chosen (and when an
 * already-cropped photo is re-opened) so the owner can zoom, drag to
 * reposition, and rotate before saving. The frame previews the exact shape the
 * photo takes on the public site, and the same normalized values render there.
 */
export function CropEditor({
  imageUrl,
  shape,
  initialCrop,
  onConfirm,
  onCancel,
  ocid,
}: CropEditorProps) {
  const [crop, setCrop] = useState<CropAdjust>(initialCrop ?? DEFAULT_CROP);
  const dragState = useRef<{ x: number; y: number } | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  // Restore the saved adjustments whenever a different photo is opened.
  useEffect(() => {
    setCrop(initialCrop ?? DEFAULT_CROP);
  }, [initialCrop]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    dragState.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = dragState.current;
    const frame = frameRef.current;
    if (!start || !frame) return;
    const rect = frame.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const deltaX = (event.clientX - start.x) / rect.width;
    const deltaY = (event.clientY - start.y) / rect.height;
    dragState.current = { x: event.clientX, y: event.clientY };
    setCrop((current) => ({
      ...current,
      offsetX: clamp(current.offsetX + deltaX, -1, 1),
      offsetY: clamp(current.offsetY + deltaY, -1, 1),
    }));
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    dragState.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const adjustZoom = (delta: number) =>
    setCrop((current) => ({
      ...current,
      zoom: clamp(
        Math.round((current.zoom + delta) * 100) / 100,
        MIN_ZOOM,
        MAX_ZOOM,
      ),
    }));

  const adjustRotation = (delta: number) =>
    setCrop((current) => ({
      ...current,
      rotation: clamp(current.rotation + delta, -180, 180),
    }));

  const reset = useCallback(() => setCrop(DEFAULT_CROP), []);

  const frameShapeClass =
    shape === "arch"
      ? "arch-frame aspect-[3/4] w-56 sm:w-64"
      : "aspect-square w-56 rounded-lg sm:w-64";

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent
        data-ocid={`${ocid}.crop_dialog`}
        className="max-w-md rounded-2xl"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Crop &amp; adjust
          </DialogTitle>
          <DialogDescription>
            Drag the photo to reposition it, then zoom and rotate until the
            framing looks right. This is how it will appear on the site.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center py-2">
          <div
            ref={frameRef}
            data-ocid={`${ocid}.crop_frame`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={`relative cursor-grab touch-none select-none overflow-hidden border border-border bg-secondary shadow-elevated active:cursor-grabbing ${frameShapeClass}`}
          >
            <img
              src={imageUrl}
              alt="Crop preview"
              draggable={false}
              className="pointer-events-none h-full w-full object-cover"
              style={{ transform: cropToTransform(crop) }}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={`${ocid}-zoom`}>Zoom</Label>
              <span className="font-mono text-xs text-muted-foreground">
                {crop.zoom.toFixed(2)}×
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label="Zoom out"
                data-ocid={`${ocid}.zoom_out_button`}
                disabled={crop.zoom <= MIN_ZOOM}
                onClick={() => adjustZoom(-ZOOM_STEP)}
              >
                <ZoomOut className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Slider
                id={`${ocid}-zoom`}
                data-ocid={`${ocid}.zoom_slider`}
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={0.01}
                value={[crop.zoom]}
                onValueChange={([value]) =>
                  setCrop((current) => ({ ...current, zoom: value }))
                }
                aria-label="Zoom"
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label="Zoom in"
                data-ocid={`${ocid}.zoom_in_button`}
                disabled={crop.zoom >= MAX_ZOOM}
                onClick={() => adjustZoom(ZOOM_STEP)}
              >
                <ZoomIn className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={`${ocid}-rotation`}>Rotate</Label>
              <span className="font-mono text-xs text-muted-foreground">
                {Math.round(crop.rotation)}°
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label="Rotate left"
                data-ocid={`${ocid}.rotate_left_button`}
                onClick={() => adjustRotation(-ROTATE_STEP)}
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Slider
                id={`${ocid}-rotation`}
                data-ocid={`${ocid}.rotation_slider`}
                min={-180}
                max={180}
                step={1}
                value={[crop.rotation]}
                onValueChange={([value]) =>
                  setCrop((current) => ({ ...current, rotation: value }))
                }
                aria-label="Rotation"
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label="Rotate right"
                data-ocid={`${ocid}.rotate_right_button`}
                onClick={() => adjustRotation(ROTATE_STEP)}
              >
                <RotateCw className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            data-ocid={`${ocid}.crop_reset_button`}
            onClick={reset}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reset
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              data-ocid={`${ocid}.crop_cancel_button`}
              onClick={onCancel}
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Cancel
            </Button>
            <Button
              type="button"
              data-ocid={`${ocid}.crop_confirm_button`}
              onClick={() => onConfirm(crop)}
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              Save crop
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
