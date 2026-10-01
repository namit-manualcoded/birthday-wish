import type { MessageInput } from "@/backend";
import { PhotoUploadField } from "@/components/admin/PhotoUploadField";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useAddMessage,
  useDeleteMessage,
  useSetMessageCrop,
  useUpdateMessage,
} from "@/hooks/useSiteContent";
import type { CropAdjust, ResolvedMessage } from "@/lib/types";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";

interface MessageEditorProps {
  messages: ResolvedMessage[];
  /** Called after a successful write so the panel can surface a status line. */
  onSaved: (message: string) => void;
  /** Called when a write fails, with a human-readable reason. */
  onError: (message: string) => void;
}

interface EditDraft {
  id: bigint;
  text: string;
  photoUrl: string | null;
  photoBytes: Uint8Array | null;
  crop: CropAdjust | null;
  position: number;
}

/**
 * Builds the complete `MessageInput` the backend's replace-style
 * `updateMessage` requires. That call replaces the whole record, so every field
 * must be sent; photo and crop fall back to the resolved message so an edit or
 * a reorder never clears a photo the owner did not touch.
 */
function toMessageInput(
  resolved: ResolvedMessage | undefined,
  draft: {
    text: string;
    position: number;
    photoBytes: Uint8Array | null;
    crop: CropAdjust | null;
  },
): MessageInput {
  return {
    text: draft.text,
    position: BigInt(draft.position),
    photo: draft.photoBytes ?? resolved?.photoBytes ?? undefined,
    crop: draft.crop ?? resolved?.crop ?? undefined,
  };
}

/**
 * Owner-only manager for the message entries: add, edit text and photo, move a
 * message up or down (persisted as its position), and delete. Every write goes
 * through the shared backend hooks, so the public site updates on invalidation.
 */
export function MessageEditor({
  messages,
  onSaved,
  onError,
}: MessageEditorProps) {
  const [newText, setNewText] = useState("");
  const [newPhotoUrl, setNewPhotoUrl] = useState<string | null>(null);
  const [newPhotoBytes, setNewPhotoBytes] = useState<Uint8Array | null>(null);
  const [newCrop, setNewCrop] = useState<CropAdjust | null>(null);
  const [editing, setEditing] = useState<EditDraft | null>(null);

  const addMessage = useAddMessage();
  const updateMessage = useUpdateMessage();
  const setMessageCrop = useSetMessageCrop();
  const deleteMessage = useDeleteMessage();

  const nextPosition = messages.reduce(
    (max, message) => Math.max(max, message.position + 1),
    0,
  );

  const handleAdd = () => {
    const text = newText.trim();
    if (!text) return;
    const photo = newPhotoBytes ?? undefined;
    const crop = newCrop ?? undefined;
    setNewText("");
    setNewPhotoUrl(null);
    setNewPhotoBytes(null);
    setNewCrop(null);
    addMessage.mutate(
      { text, position: BigInt(nextPosition), photo, crop },
      {
        onSuccess: () => onSaved("Message added."),
        onError: () => {
          setNewText((current) => (current === "" ? text : current));
          onError("Could not add the message. Try again.");
        },
      },
    );
  };

  const handleSaveEdit = () => {
    if (!editing) return;
    const text = editing.text.trim();
    if (!text) return;
    // The backend replaces the whole record, so send every field and fall back
    // to the resolved message for photo/crop: a text-only edit must not clear
    // the photo the owner never touched.
    const resolved = messages.find((message) => message.id === editing.id);
    const input = toMessageInput(resolved, {
      text,
      position: editing.position,
      photoBytes: editing.photoBytes,
      crop: editing.crop,
    });
    updateMessage.mutate(
      { id: editing.id, input },
      {
        onSuccess: () => {
          setEditing(null);
          onSaved("Message updated.");
        },
        onError: () => onError("Could not update the message. Try again."),
      },
    );
  };

  const handleMove = (message: ResolvedMessage, direction: -1 | 1) => {
    // Positions can have gaps after a delete, so match by the message's index
    // in the already-sorted list rather than by an exact position value.
    const index = messages.findIndex(
      (candidate) => candidate.id === message.id,
    );
    const target = messages[index + direction];
    if (!target) return;
    // Swap both positions so the two entries exchange places; updating only one
    // would leave them tied and the backend's sort would not change the order.
    // Each write re-sends the full record (including the untouched photo/crop)
    // because the backend replaces the whole message.
    updateMessage.mutate(
      {
        id: message.id,
        input: toMessageInput(message, {
          text: message.text,
          position: target.position,
          photoBytes: message.photoBytes,
          crop: message.crop,
        }),
      },
      {
        onSuccess: () => {
          updateMessage.mutate(
            {
              id: target.id,
              input: toMessageInput(target, {
                text: target.text,
                position: message.position,
                photoBytes: target.photoBytes,
                crop: target.crop,
              }),
            },
            {
              onSuccess: () => onSaved("Message order updated."),
              onError: () => onError("Could not reorder the messages."),
            },
          );
        },
        onError: () => onError("Could not reorder the messages."),
      },
    );
  };

  const handleDelete = (message: ResolvedMessage) => {
    deleteMessage.mutate(message.id, {
      onSuccess: () => onSaved("Message deleted."),
      onError: () => onError("Could not delete the message. Try again."),
    });
  };

  return (
    <div className="space-y-6">
      {messages.length === 0 ? (
        <div
          data-ocid="owner.messages.empty_state"
          className="rounded-lg border border-dashed border-border bg-card/60 px-6 py-8 text-center"
        >
          <p className="font-display text-base text-foreground">
            No messages yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add the first note below — it appears on the site right away.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {messages.map((message, index) => {
            const isEditing = editing?.id === message.id;
            return (
              <li
                key={message.id.toString()}
                data-ocid={`owner.message.item.${index + 1}`}
                className="rounded-lg border border-border bg-card p-4"
              >
                {isEditing && editing ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor={`message-text-${index + 1}`}>
                        Message {index + 1}
                      </Label>
                      <Textarea
                        id={`message-text-${index + 1}`}
                        data-ocid={`owner.message.textarea.${index + 1}`}
                        value={editing.text}
                        onChange={(event) =>
                          setEditing({ ...editing, text: event.target.value })
                        }
                        rows={3}
                      />
                    </div>

                    <PhotoUploadField
                      label="Message photo"
                      currentUrl={editing.photoUrl}
                      currentCrop={editing.crop}
                      shape="square"
                      ocid={`owner.message.photo.${index + 1}`}
                      onUploaded={(_url, bytes, crop) =>
                        setEditing({
                          ...editing,
                          photoUrl: _url,
                          photoBytes: bytes,
                          crop,
                        })
                      }
                      onCropSaved={async (crop) => {
                        setEditing({ ...editing, crop });
                        try {
                          // Persist through the dedicated crop endpoint so the
                          // photo bytes are never part of the write and cannot
                          // be cleared by a re-crop.
                          await setMessageCrop.mutateAsync({
                            id: editing.id,
                            crop,
                          });
                          onSaved("Message photo crop saved.");
                        } catch {
                          onError("Could not save the message photo crop.");
                        }
                      }}
                      onError={onError}
                    />

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        data-ocid={`owner.message.save_button.${index + 1}`}
                        onClick={handleSaveEdit}
                        disabled={
                          updateMessage.isPending || editing.text.trim() === ""
                        }
                      >
                        {updateMessage.isPending ? (
                          <Loader2
                            className="h-4 w-4 animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <Check className="h-4 w-4" aria-hidden="true" />
                        )}
                        Save
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        data-ocid={`owner.message.cancel_button.${index + 1}`}
                        onClick={() => setEditing(null)}
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    {message.photoUrl ? (
                      <img
                        src={message.photoUrl}
                        alt={`Message ${index + 1}`}
                        className="h-14 w-14 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-secondary text-xs text-muted-foreground">
                        No photo
                      </div>
                    )}

                    <p className="min-w-0 flex-1 text-sm leading-relaxed text-foreground">
                      {message.text}
                    </p>

                    <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Move message ${index + 1} up`}
                        data-ocid={`owner.message.move_up_button.${index + 1}`}
                        disabled={index === 0 || updateMessage.isPending}
                        onClick={() => handleMove(message, -1)}
                      >
                        <ArrowUp className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Move message ${index + 1} down`}
                        data-ocid={`owner.message.move_down_button.${index + 1}`}
                        disabled={
                          index === messages.length - 1 ||
                          updateMessage.isPending
                        }
                        onClick={() => handleMove(message, 1)}
                      >
                        <ArrowDown className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Edit message ${index + 1}`}
                        data-ocid={`owner.message.edit_button.${index + 1}`}
                        onClick={() =>
                          setEditing({
                            id: message.id,
                            text: message.text,
                            photoUrl: message.photoUrl,
                            photoBytes: message.photoBytes,
                            crop: message.crop,
                            position: message.position,
                          })
                        }
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Delete message ${index + 1}`}
                        data-ocid={`owner.message.delete_button.${index + 1}`}
                        disabled={deleteMessage.isPending}
                        onClick={() => handleDelete(message)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="space-y-3 rounded-lg border border-border bg-secondary/40 p-4">
        <div className="space-y-2">
          <Label htmlFor="new-message-text">Add a message</Label>
          <Textarea
            id="new-message-text"
            data-ocid="owner.new_message.textarea"
            value={newText}
            onChange={(event) => setNewText(event.target.value)}
            placeholder="Write something from the heart…"
            rows={3}
          />
        </div>

        <PhotoUploadField
          label="Photo (optional)"
          currentUrl={newPhotoUrl}
          currentCrop={newCrop}
          shape="square"
          ocid="owner.new_message.photo"
          hint="Pair this note with a photo."
          onUploaded={(url, bytes, crop) => {
            setNewPhotoUrl(url);
            setNewPhotoBytes(bytes);
            setNewCrop(crop);
          }}
          onCropSaved={(crop) => setNewCrop(crop)}
          onError={onError}
        />

        <Button
          type="button"
          data-ocid="owner.new_message.add_button"
          onClick={handleAdd}
          disabled={addMessage.isPending || newText.trim() === ""}
        >
          {addMessage.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Plus className="h-4 w-4" aria-hidden="true" />
          )}
          {addMessage.isPending ? "Adding…" : "Add message"}
        </Button>
      </div>
    </div>
  );
}
