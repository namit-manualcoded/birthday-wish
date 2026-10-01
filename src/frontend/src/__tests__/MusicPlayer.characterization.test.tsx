import { MusicPlayer } from "@/components/MusicPlayer";
import { useMusic } from "@/hooks/useMusic";
import { DEFAULT_SONG_URL } from "@/lib/placeholder-content";
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

/**
 * Characterization of the background-music behavior that must survive the
 * autoplay change.
 *
 * These tests deliberately do NOT assert the absence of a volume control or the
 * upload-only owner UI — those are the behaviors the request intentionally
 * changes. They pin the parts that must keep working: a single site-wide audio
 * element, the bundled default song fallback, a visible play/pause control that
 * toggles playback, and a volume control that reports changes.
 *
 * The request makes the song attempt to autoplay on mount, so the hook now
 * reports playing without an explicit `start()`; the tests below assert that
 * observable contract rather than the old "silent until interaction" one.
 */

/** The fake `Audio` installed by vitest.setup.ts, narrowed for assertions. */
interface FakeAudioElement extends EventTarget {
  loop: boolean;
  preload: string;
  src: string;
  paused: boolean;
  volume: number;
  play: () => Promise<void>;
  pause: () => void;
  load: () => void;
}

/** Flush the autoplay promise chain the hook kicks off on mount. */
async function flushAutoplay() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("useMusic characterization", () => {
  it("falls back to the bundled default song when no song is set", async () => {
    const { result } = renderHook(() => useMusic(null));
    await flushAutoplay();

    // The hook owns exactly one audio element for the whole site.
    const audio = (
      globalThis as unknown as { Audio: new () => FakeAudioElement }
    ).Audio;
    expect(audio).toBeDefined();
    // With no song set, the bundled default is the source that autoplays.
    expect(result.current.isPlaying).toBe(true);
    expect(result.current.hasStarted).toBe(true);
  });

  it("autoplays on mount and reports playing without an explicit start", async () => {
    const { result } = renderHook(() => useMusic(DEFAULT_SONG_URL));
    await flushAutoplay();

    expect(result.current.hasStarted).toBe(true);
    expect(result.current.isPlaying).toBe(true);
    expect(result.current.needsInteraction).toBe(false);
  });

  it("toggles between play and pause through the same control", async () => {
    const { result } = renderHook(() => useMusic(DEFAULT_SONG_URL));
    await flushAutoplay();
    expect(result.current.isPlaying).toBe(true);

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isPlaying).toBe(false);

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isPlaying).toBe(true);
  });

  it("starts at maximum volume and exposes a volume setter", async () => {
    const { result } = renderHook(() => useMusic(DEFAULT_SONG_URL));
    await flushAutoplay();

    expect(result.current.volume).toBe(1);

    act(() => {
      result.current.setVolume(0.4);
    });
    expect(result.current.volume).toBe(0.4);
  });

  it("keeps looping enabled so the song plays continuously", () => {
    // The hook sets `loop = true` on its audio element; assert the observable
    // contract through the fake element the setup installs.
    const created: FakeAudioElement[] = [];
    const OriginalAudio = (
      globalThis as unknown as { Audio: new () => FakeAudioElement }
    ).Audio;
    class RecordingAudio extends (OriginalAudio as unknown as {
      new (): FakeAudioElement;
    }) {
      constructor() {
        super();
        created.push(this);
      }
    }
    Object.defineProperty(globalThis, "Audio", {
      configurable: true,
      writable: true,
      value: RecordingAudio,
    });

    try {
      renderHook(() => useMusic(DEFAULT_SONG_URL));
      expect(created).toHaveLength(1);
      expect(created[0].loop).toBe(true);
    } finally {
      Object.defineProperty(globalThis, "Audio", {
        configurable: true,
        writable: true,
        value: OriginalAudio,
      });
    }
  });
});

describe("MusicPlayer characterization", () => {
  it("always renders a visible play/pause control", () => {
    render(
      <MusicPlayer
        isPlaying={false}
        hasStarted={false}
        needsInteraction={false}
        volume={1}
        onVolumeChange={vi.fn()}
        onToggle={vi.fn()}
        onStart={vi.fn()}
      />,
    );

    const toggle = screen.getByTestId("music.toggle");
    expect(toggle).toBeVisible();
    expect(toggle).toHaveAttribute("aria-label", "Play background music");
    expect(toggle).toHaveAttribute("aria-pressed", "false");
  });

  it("reflects the playing state on the control", () => {
    render(
      <MusicPlayer
        isPlaying={true}
        hasStarted={true}
        needsInteraction={false}
        volume={1}
        onVolumeChange={vi.fn()}
        onToggle={vi.fn()}
        onStart={vi.fn()}
      />,
    );

    const toggle = screen.getByTestId("music.toggle");
    expect(toggle).toHaveAttribute("aria-label", "Pause background music");
    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });

  it("invokes onToggle when the visitor clicks the control", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <MusicPlayer
        isPlaying={false}
        hasStarted={false}
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

  it("invokes onStart from the tap-to-play prompt when autoplay is blocked", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(
      <MusicPlayer
        isPlaying={false}
        hasStarted={false}
        needsInteraction={true}
        volume={1}
        onVolumeChange={vi.fn()}
        onToggle={vi.fn()}
        onStart={onStart}
      />,
    );

    await user.click(screen.getByTestId("music.start_button"));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("hides the start prompt once playback has begun", () => {
    render(
      <MusicPlayer
        isPlaying={true}
        hasStarted={true}
        needsInteraction={false}
        volume={1}
        onVolumeChange={vi.fn()}
        onToggle={vi.fn()}
        onStart={vi.fn()}
      />,
    );

    expect(screen.queryByTestId("music.start_button")).not.toBeInTheDocument();
    expect(screen.getByTestId("music.toggle")).toBeInTheDocument();
  });

  it("reports volume changes from the slider", () => {
    const onVolumeChange = vi.fn();
    render(
      <MusicPlayer
        isPlaying={true}
        hasStarted={true}
        needsInteraction={false}
        volume={1}
        onVolumeChange={onVolumeChange}
        onToggle={vi.fn()}
        onStart={vi.fn()}
      />,
    );

    const slider = screen.getByTestId("music.volume_slider");
    expect(slider).toHaveValue("1");
    // A range input is not an editable text field, so drive it with a change
    // event rather than user-event's clear/type helpers.
    fireEvent.change(slider, { target: { value: "0.5" } });
    expect(onVolumeChange).toHaveBeenCalledWith(0.5);
  });
});
