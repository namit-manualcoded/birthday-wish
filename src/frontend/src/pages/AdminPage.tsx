import { GreetingEditor } from "@/components/admin/GreetingEditor";
import { MessageEditor } from "@/components/admin/MessageEditor";
import { PhotoUploadField } from "@/components/admin/PhotoUploadField";
import { SongUploadField } from "@/components/admin/SongUploadField";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useIsOwner,
  useSetHeroCrop,
  useSetHeroPhoto,
  useSetSong,
  useSiteContent,
} from "@/hooks/useSiteContent";
import { PLACEHOLDER_CONTENT } from "@/lib/placeholder-content";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { CheckCircle2, Heart, Lock, LogOut, XCircle } from "lucide-react";
import { useState } from "react";

type Status = { kind: "success" | "error"; message: string } | null;

/**
 * Owner-only management panel. Signed-in owners edit the greeting, hero photo,
 * messages, and background song; every change is persisted through the backend
 * and reflected on the public site. Non-owners see a clear access notice.
 */
export function AdminPage() {
  const { data, isLoading } = useSiteContent();
  const { data: isOwner, isLoading: isOwnerLoading } = useIsOwner();
  const { login, clear, isAuthenticated, isLoggingIn } = useInternetIdentity();
  const [status, setStatus] = useState<Status>(null);

  const setHeroPhoto = useSetHeroPhoto();
  const setHeroCrop = useSetHeroCrop();
  const setSong = useSetSong();

  const content = data ?? PLACEHOLDER_CONTENT;

  const reportSaved = (message: string) =>
    setStatus({ kind: "success", message });
  const reportError = (message: string) =>
    setStatus({ kind: "error", message });

  if (!isAuthenticated) {
    return (
      <section
        data-ocid="admin.gate"
        className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center px-5 py-20 text-center"
      >
        <div className="glass-panel w-full rounded-2xl px-8 py-12 shadow-elevated">
          <Lock className="mx-auto h-8 w-8 text-accent" aria-hidden="true" />
          <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight text-foreground">
            Owner sign in
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Sign in to edit the greeting, photos, messages, and song. The first
            person to sign in becomes the owner.
          </p>
          <Button
            type="button"
            data-ocid="admin.login_button"
            className="mt-7 rounded-full"
            onClick={() => login()}
            disabled={isLoggingIn}
          >
            <Lock className="h-4 w-4" aria-hidden="true" />
            {isLoggingIn ? "Signing in…" : "Sign in with Internet Identity"}
          </Button>
        </div>
      </section>
    );
  }

  if (isOwnerLoading) {
    return (
      <section
        data-ocid="admin.loading_state"
        className="mx-auto w-full max-w-3xl px-5 py-20 sm:px-8"
        aria-hidden="true"
      >
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="mt-6 h-64 animate-pulse rounded-2xl bg-muted" />
      </section>
    );
  }

  if (!isOwner) {
    return (
      <section
        data-ocid="admin.not_owner"
        className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center px-5 py-20 text-center"
      >
        <div className="glass-panel w-full rounded-2xl px-8 py-12 shadow-elevated">
          <Heart className="mx-auto h-8 w-8 text-accent" aria-hidden="true" />
          <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight text-foreground">
            This panel is for the owner
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            You are signed in, but this account does not manage the site. Sign
            out and use the owner account to make changes.
          </p>
          <Button
            type="button"
            variant="outline"
            data-ocid="admin.logout_button"
            className="mt-7 rounded-full"
            onClick={clear}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section
      data-ocid="admin.page"
      className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-8 sm:py-16"
    >
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-eyebrow text-accent">Owner panel</p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Edit your tribute
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Everything here is saved to the site and appears on the public page
            right away.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-ocid="admin.logout_button"
          className="rounded-full"
          onClick={clear}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out
        </Button>
      </header>

      {status ? (
        <div
          data-ocid={
            status.kind === "success"
              ? "admin.success_state"
              : "admin.error_state"
          }
          className={`mt-6 flex items-start gap-2 rounded-lg px-4 py-3 text-sm ${
            status.kind === "success"
              ? "bg-secondary text-secondary-foreground"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          {status.kind === "success" ? (
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span>{status.message}</span>
        </div>
      ) : null}

      <Tabs defaultValue="greeting" className="mt-8">
        <TabsList
          data-ocid="admin.tabs"
          className="h-auto w-full flex-wrap justify-start gap-1 rounded-full bg-muted p-1"
        >
          <TabsTrigger
            value="greeting"
            data-ocid="admin.greeting.tab"
            className="rounded-full px-4"
          >
            Greeting
          </TabsTrigger>
          <TabsTrigger
            value="photos"
            data-ocid="admin.photos.tab"
            className="rounded-full px-4"
          >
            Photos &amp; song
          </TabsTrigger>
          <TabsTrigger
            value="messages"
            data-ocid="admin.messages.tab"
            className="rounded-full px-4"
          >
            Messages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="greeting" className="mt-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-subtle sm:p-8">
            <h2 className="font-display text-xl font-semibold text-foreground">
              Birthday greeting
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The headline and subtext at the top of the page.
            </p>
            <Separator className="my-6" />
            <GreetingEditor
              headline={content.headline}
              subtext={content.subtext}
              onSaved={reportSaved}
              onError={reportError}
            />
          </div>
        </TabsContent>

        <TabsContent value="photos" className="mt-6">
          <div className="space-y-8 rounded-2xl border border-border bg-card p-6 shadow-subtle sm:p-8">
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground">
                Hero photo
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The arched portrait at the top of the page.
              </p>
              <div className="mt-5">
                <PhotoUploadField
                  label="Hero photo"
                  currentUrl={content.heroPhotoUrl}
                  currentCrop={content.heroCrop}
                  shape="arch"
                  ocid="owner.hero_photo"
                  hint="Portrait arch — crop and adjust how it frames."
                  onUploaded={async (_url, bytes, crop) => {
                    try {
                      await setHeroPhoto.mutateAsync(bytes);
                      await setHeroCrop.mutateAsync(crop);
                      reportSaved("Hero photo updated.");
                    } catch {
                      reportError("Could not update the hero photo.");
                    }
                  }}
                  onCropSaved={async (crop) => {
                    try {
                      await setHeroCrop.mutateAsync(crop);
                      reportSaved("Hero photo crop saved.");
                    } catch {
                      reportError("Could not save the hero photo crop.");
                    }
                  }}
                  onError={reportError}
                />
              </div>
            </div>

            <Separator />

            <div>
              <h2 className="font-display text-xl font-semibold text-foreground">
                Background song
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Plays continuously across the site with a visible control.
              </p>
              <div className="mt-5">
                <SongUploadField
                  currentUrl={content.songUrl}
                  onUploaded={async (_url, bytes) => {
                    try {
                      await setSong.mutateAsync(bytes);
                      reportSaved("Background song updated.");
                    } catch {
                      reportError("Could not update the song.");
                    }
                  }}
                  onError={reportError}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="messages" className="mt-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-subtle sm:p-8">
            <h2 className="font-display text-xl font-semibold text-foreground">
              Messages
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Each note can have its own text and photo. Use the arrows to
              reorder.
            </p>
            <Separator className="my-6" />
            {isLoading && !data ? (
              <div
                data-ocid="admin.messages.loading_state"
                className="space-y-3"
                aria-hidden="true"
              >
                {["a", "b", "c"].map((id) => (
                  <div
                    key={id}
                    className="h-20 animate-pulse rounded-lg bg-muted"
                  />
                ))}
              </div>
            ) : (
              <MessageEditor
                messages={content.messages}
                onSaved={reportSaved}
                onError={reportError}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}
