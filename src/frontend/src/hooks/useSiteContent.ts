import { createActor } from "@/backend";
import type {
  CropAdjust,
  GreetingInput,
  MessageInput,
  StoredFile,
} from "@/backend";
import { type ResolvedSiteContent, blobToDisplayUrl } from "@/lib/types";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const SITE_CONTENT_KEY = ["siteContent"] as const;

/**
 * The regenerated bindings map `StoredFile` to raw `Uint8Array` bytes, so the
 * backend returns bytes with no display URL. Resolve both the renderable URL
 * and the raw bytes (kept for re-submission on edit/reorder).
 */
function resolvePhoto(
  photo: StoredFile | undefined,
  kind: "image" | "audio" = "image",
): { url: string | null; bytes: Uint8Array | null } {
  if (!photo || photo.length === 0) return { url: null, bytes: null };
  return { url: blobToDisplayUrl(photo, kind), bytes: photo };
}

/**
 * Public read of all site content, resolved into displayable URLs and sorted
 * by the owner-defined position.
 */
export function useSiteContent() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: SITE_CONTENT_KEY,
    queryFn: async (): Promise<ResolvedSiteContent> => {
      if (!actor) throw new Error("Backend is not ready");
      const content = await actor.getSiteContent();
      const hero = resolvePhoto(content.greeting.heroPhoto);
      const song = resolvePhoto(content.song, "audio");
      return {
        headline: content.greeting.headline,
        subtext: content.greeting.subtext,
        heroPhotoUrl: hero.url,
        heroCrop: content.greeting.heroCrop ?? null,
        songUrl: song.url,
        messages: [...content.messages]
          .sort((a, b) => Number(a.position - b.position))
          .map((message) => {
            const photo = resolvePhoto(message.photo);
            return {
              id: message.id,
              text: message.text,
              photoUrl: photo.url,
              photoBytes: photo.bytes,
              crop: message.crop ?? null,
              position: Number(message.position),
            };
          }),
      };
    },
    enabled: !!actor && !isFetching,
  });
}

/** Owner-only: update the greeting headline and subtext. */
export function useUpdateGreeting() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: GreetingInput) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.updateGreeting(input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SITE_CONTENT_KEY });
    },
  });
}

/** Owner-only: set or replace the hero photo with raw image bytes. */
export function useSetHeroPhoto() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bytes: Uint8Array) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.setHeroPhoto(bytes);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SITE_CONTENT_KEY });
    },
  });
}

/** Owner-only: save crop/adjust parameters for the hero photo. */
export function useSetHeroCrop() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (crop: CropAdjust) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.setHeroCrop(crop);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SITE_CONTENT_KEY });
    },
  });
}

/** Owner-only: add a message entry. */
export function useAddMessage() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: MessageInput) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.addMessage(input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SITE_CONTENT_KEY });
    },
  });
}

/** Owner-only: update a message entry. */
export function useUpdateMessage() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: bigint; input: MessageInput }) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.updateMessage(id, input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SITE_CONTENT_KEY });
    },
  });
}

/** Owner-only: save crop/adjust parameters for a message's photo. */
export function useSetMessageCrop() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, crop }: { id: bigint; crop: CropAdjust }) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.setMessageCrop(id, crop);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SITE_CONTENT_KEY });
    },
  });
}

/** Owner-only: delete a message entry. */
export function useDeleteMessage() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.deleteMessage(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SITE_CONTENT_KEY });
    },
  });
}

/** Owner-only: set or replace the background song with raw audio bytes. */
export function useSetSong() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bytes: Uint8Array) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.setSong(bytes);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SITE_CONTENT_KEY });
    },
  });
}

/** Owner check for the signed-in principal. */
export function useIsOwner() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["isOwner"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}
