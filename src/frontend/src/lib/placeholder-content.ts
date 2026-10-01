import type { ResolvedSiteContent } from "./types";

/**
 * A gentle, royalty-free ambient loop shipped with the app so autoplay always
 * has a real source, even before the owner uploads their own song.
 */
export const DEFAULT_SONG_URL = "/assets/audio/birthday-theme.wav";

/**
 * Graceful fallback shown while the backend is loading or before the owner has
 * published any content. Keeps the first paint intentional instead of blank.
 */
export const PLACEHOLDER_CONTENT: ResolvedSiteContent = {
  headline: "Happy Birthday, Niti",
  subtext:
    "A little corner of the internet, built entirely for you — every word, every photo, every note.",
  heroPhotoUrl: "/assets/generated/hero-birthday.dim_1200x1600.jpg",
  heroCrop: null,
  songUrl: DEFAULT_SONG_URL,
  messages: [
    {
      id: 1n,
      text: "From the very first day, you turned ordinary moments into something worth remembering. Today the whole world gets to celebrate the day you arrived in it.",
      photoUrl: "/assets/generated/hero-birthday.dim_1200x1600.jpg",
      photoBytes: null,
      crop: null,
      position: 0,
    },
    {
      id: 2n,
      text: "You have a way of making everything softer — mornings, worries, even the quiet in between. I hope this year is as gentle with you as you are with everyone else.",
      photoUrl: "/assets/generated/hero-birthday.dim_1200x1600.jpg",
      photoBytes: null,
      crop: null,
      position: 1,
    },
    {
      id: 3n,
      text: "Here is to another year of your laugh, your ideas, and the small kindnesses you never notice you give. I am so lucky to be beside you for all of it.",
      photoUrl: "/assets/generated/hero-birthday.dim_1200x1600.jpg",
      photoBytes: null,
      crop: null,
      position: 2,
    },
  ],
};

/**
 * Fills gaps in backend content with the placeholder so a fresh, live-but-empty
 * backend still renders a complete experience. The owner's real content always
 * wins; placeholders only stand in for fields that are still empty.
 */
export function withPlaceholderFallback(
  content: ResolvedSiteContent | undefined,
): ResolvedSiteContent {
  if (!content) return PLACEHOLDER_CONTENT;

  const headline = content.headline.trim();
  const subtext = content.subtext.trim();
  const hasMessages = content.messages.length > 0;

  return {
    headline: headline || PLACEHOLDER_CONTENT.headline,
    subtext: subtext || PLACEHOLDER_CONTENT.subtext,
    heroPhotoUrl: content.heroPhotoUrl ?? PLACEHOLDER_CONTENT.heroPhotoUrl,
    heroCrop: content.heroCrop,
    songUrl: content.songUrl ?? DEFAULT_SONG_URL,
    messages: hasMessages ? content.messages : PLACEHOLDER_CONTENT.messages,
  };
}
