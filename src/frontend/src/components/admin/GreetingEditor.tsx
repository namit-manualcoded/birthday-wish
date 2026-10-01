import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateGreeting } from "@/hooks/useSiteContent";
import { Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";

interface GreetingEditorProps {
  headline: string;
  subtext: string;
  /** Called after a successful save so the panel can surface a status line. */
  onSaved: (message: string) => void;
  /** Called when the save fails, with a human-readable reason. */
  onError: (message: string) => void;
}

/**
 * Owner-only editor for the birthday greeting headline and subtext. The draft
 * lives in local state and is only reset when the saved values change, so a
 * background refetch never clobbers what the owner is typing.
 */
export function GreetingEditor({
  headline,
  subtext,
  onSaved,
  onError,
}: GreetingEditorProps) {
  const [draftHeadline, setDraftHeadline] = useState(headline);
  const [draftSubtext, setDraftSubtext] = useState(subtext);
  const updateGreeting = useUpdateGreeting();

  useEffect(() => {
    setDraftHeadline(headline);
    setDraftSubtext(subtext);
  }, [headline, subtext]);

  const isDirty = draftHeadline !== headline || draftSubtext !== subtext;
  const canSave =
    isDirty && draftHeadline.trim() !== "" && draftSubtext.trim() !== "";

  const handleSave = () => {
    if (!canSave) return;
    updateGreeting.mutate(
      { headline: draftHeadline.trim(), subtext: draftSubtext.trim() },
      {
        onSuccess: () => onSaved("Greeting saved."),
        onError: () => onError("Could not save the greeting. Try again."),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="greeting-headline">Headline</Label>
        <Input
          id="greeting-headline"
          data-ocid="owner.greeting.headline_input"
          value={draftHeadline}
          onChange={(event) => setDraftHeadline(event.target.value)}
          placeholder="Happy Birthday, Niti"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="greeting-subtext">Subtext</Label>
        <Textarea
          id="greeting-subtext"
          data-ocid="owner.greeting.subtext_input"
          value={draftSubtext}
          onChange={(event) => setDraftSubtext(event.target.value)}
          placeholder="A little corner of the internet, built entirely for you."
          rows={3}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          data-ocid="owner.greeting.save_button"
          onClick={handleSave}
          disabled={!canSave || updateGreeting.isPending}
        >
          {updateGreeting.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="h-4 w-4" aria-hidden="true" />
          )}
          {updateGreeting.isPending ? "Saving…" : "Save greeting"}
        </Button>
        {!isDirty ? (
          <span className="text-xs text-muted-foreground">
            No unsaved changes.
          </span>
        ) : null}
      </div>
    </div>
  );
}
