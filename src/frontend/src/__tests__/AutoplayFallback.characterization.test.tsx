import { MusicPlayer } from "@/components/MusicPlayer";
import { useMusic } from "@/hooks/useMusic";
import { DEFAULT_SONG_URL } from "@/lib/placeholder-content";
import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

/**
 * Characterization of the autoplay-blocked fallback — the behavior the
 * acceptance criteria explicitly require.
 *
 * The request makes the background song attempt to autoplay on site open and
 * loop continuously, with a tap-to-play prompt when the browser blocks
 * autoplay. These tests pin the fallback contract: a rejected `play()` never
 * leaves the site stuck claiming to play, the control stays available, and a
 * later interaction retries playback.
 */

/** The fake `Audio` installed by vitest.setup.ts, narrowed for assertions. */
interface FakeAudioElement extends EventTarget {
  loop: boolean;
  preload: string;
  src: string;
  paused: boolean;
  volume: number;
  play(): Promise<void>;
  pause(): void;
  load(): void;
}

/**
 * Replaces the fake Audio with one whose first `play()` rejects, as a blocked
 * autoplay does, and whose later calls succeed like a user-initiated retry.
 * The hook attempts autoplay on mount, so that first rejected call is the
 * blocked autoplay; a later `start()`/`toggle()` is the retry.
 */
function installBlockedAudio(): {
  created: FakeAudioElement[];
  restore: () => void;
} {
  const created: FakeAudioElement[] = [];
  const Original = (
    globalThis as unknown as { Audio: new () => FakeAudioElement }
  ).Audio;
  class BlockedAudio extends (Original as unknown as {
    new (): FakeAudioElement;
  }) {
    private attempts = 0;
    constructor() {
      super();
      created.push(this);
    }
    play(): Promise<void> {
      this.attempts += 1;
      if (this.attempts === 1) {
        return Promise.reject(new DOMException("blocked", "NotAllowedError"));
      }
      this.paused = false;
      this.dispatchEvent(new Event("play"));
      return Promise.resolve();
    }
  }
  Object.defineProperty(globalThis, "Audio", {
    configurable: true,
    writable: true,
    value: BlockedAudio,
  });
  return {
    created,
    restore: () =>
      Object.defineProperty(globalThis, "Audio", {
        configurable: true,
        writable: true,
        value: Original,
      }),
  };
}

/** Flush the mount autoplay promise chain so its rejection is observed. */
async function flushAutoplay() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("autoplay-blocked fallback characterization", () => {
  it("does not report playing when the browser blocks autoplay", async () => {
    const blocked = installBlockedAudio();
    try {
      const { result } = renderHook(() => useMusic(DEFAULT_SONG_URL));
      await flushAutoplay();

      // A blocked autoplay must not leave the UI claiming the song is playing,
      // and it must arm the tap-to-play prompt instead.
      expect(result.current.isPlaying).toBe(false);
      expect(result.current.hasStarted).toBe(false);
      expect(result.current.needsInteraction).toBe(true);
    } finally {
      blocked.restore();
    }
  });

  it("keeps the control usable and retries playback on a later interaction", async () => {
    const blocked = installBlockedAudio();
    try {
      const { result } = renderHook(() => useMusic(DEFAULT_SONG_URL));
      await flushAutoplay();
      expect(result.current.isPlaying).toBe(false);

      // The visitor can still interact; the retry must reach the audio element
      // rather than being permanently disabled by the earlier rejection.
      await act(async () => {
        result.current.start();
      });

      expect(result.current.isPlaying).toBe(true);
      expect(result.current.needsInteraction).toBe(false);
    } finally {
      blocked.restore();
    }
  });

  it("keeps a visible play/pause control after a blocked start", () => {
    render(
      <MusicPlayer
        isPlaying={false}
        hasStarted={true}
        needsInteraction={false}
        volume={1}
        onVolumeChange={vi.fn()}
        onToggle={vi.fn()}
        onStart={vi.fn()}
      />,
    );

    const toggle = screen.getByTestId("music.toggle");
    expect(toggle).toBeVisible();
    expect(toggle).toBeEnabled();
    expect(toggle).toHaveAttribute("aria-label", "Play background music");
  });

  it("invokes onToggle when the visitor retries from the control", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <MusicPlayer
        isPlaying={false}
        hasStarted={true}
        needsInteraction={false}
        volume={1}
        onVolumeChange={vi.fn()}
        onToggle={onToggle}
        onStart={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId("music.toggle"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
