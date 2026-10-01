import App from "@/App";
import { DEFAULT_SONG_URL } from "@/lib/placeholder-content";
import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type MockBackend,
  createMockBackend,
  makeSiteContent,
  renderWithProviders,
} from "./test-utils";

/**
 * Characterization of the site-wide music source and the owner song-upload
 * path — the parts of the music feature the upcoming change must preserve.
 *
 * The request adds a volume slider and a "paste a direct audio URL" owner path.
 * It must not break: the bundled default song playing until the owner sets
 * their own, the single site-wide audio element surviving navigation, or the
 * existing file-upload path that persists raw audio bytes.
 */

vi.mock("@caffeineai/core-infrastructure", () => ({
  useActor: vi.fn(),
  useInternetIdentity: vi.fn(),
}));

vi.mock("@caffeineai/object-storage", () => ({
  ExternalBlob: {
    fromBytes: (bytes: Uint8Array, type: string, name: string) => ({
      bytes,
      type,
      name,
      withUploadProgress: vi.fn(),
      getDirectURL: () => `blob:mock/${name}`,
    }),
  },
}));

const mockedUseActor = vi.mocked(useActor);
const mockedUseInternetIdentity = vi.mocked(useInternetIdentity);

function setActor(actor: MockBackend | null) {
  mockedUseActor.mockReturnValue({
    actor,
    isFetching: false,
  } as unknown as ReturnType<typeof useActor>);
}

function setIdentity(overrides: {
  isAuthenticated?: boolean;
  isLoggingIn?: boolean;
  login?: () => void;
  clear?: () => void;
}) {
  mockedUseInternetIdentity.mockReturnValue({
    isAuthenticated: false,
    isLoggingIn: false,
    login: vi.fn(),
    clear: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useInternetIdentity>);
}

/** Captures every `new Audio()` the app creates so tests can inspect its src. */
function captureAudioElements(): {
  elements: Array<{ src: string; loop: boolean }>;
  restore: () => void;
} {
  const elements: Array<{ src: string; loop: boolean }> = [];
  const Original = (globalThis as unknown as { Audio: new () => unknown })
    .Audio;
  class RecordingAudio extends (Original as unknown as { new (): object }) {
    src = "";
    loop = false;
    preload = "";
    paused = true;
    constructor() {
      super();
      elements.push(this as unknown as { src: string; loop: boolean });
    }
  }
  Object.defineProperty(globalThis, "Audio", {
    configurable: true,
    writable: true,
    value: RecordingAudio,
  });
  return {
    elements,
    restore: () =>
      Object.defineProperty(globalThis, "Audio", {
        configurable: true,
        writable: true,
        value: Original,
      }),
  };
}

describe("site-wide music source characterization", () => {
  beforeEach(() => {
    setIdentity({});
  });

  it("uses the bundled default song when the backend has no song", async () => {
    const capture = captureAudioElements();
    try {
      const actor = createMockBackend({ getSiteContent: makeSiteContent() });
      setActor(actor);

      renderWithProviders(<App />);
      await screen.findByTestId("hero.section");

      await waitFor(() => {
        expect(capture.elements.length).toBeGreaterThan(0);
        expect(capture.elements[0].src).toBe(DEFAULT_SONG_URL);
      });
    } finally {
      capture.restore();
    }
  });

  it("keeps a single looping audio element across the public site", async () => {
    const capture = captureAudioElements();
    try {
      const actor = createMockBackend({ getSiteContent: makeSiteContent() });
      setActor(actor);

      renderWithProviders(<App />);
      await screen.findByTestId("hero.section");

      // One element for the whole site, looping so the song never stops.
      expect(capture.elements).toHaveLength(1);
      expect(capture.elements[0].loop).toBe(true);
    } finally {
      capture.restore();
    }
  });

  it("keeps the music control available on the public site", async () => {
    const actor = createMockBackend({ getSiteContent: makeSiteContent() });
    setActor(actor);

    renderWithProviders(<App />);
    await screen.findByTestId("hero.section");

    expect(screen.getByTestId("music.toggle")).toBeVisible();
  });
});

describe("owner song upload characterization", () => {
  beforeEach(() => {
    setIdentity({ isAuthenticated: true });
  });

  it("persists the uploaded audio bytes through the backend", async () => {
    const user = userEvent.setup();
    const actor = createMockBackend({
      getSiteContent: makeSiteContent(),
      isCallerAdmin: true,
      setSong: new Uint8Array([9, 8, 7]),
    });
    setActor(actor);

    renderWithProviders(<App />);
    await user.click(await screen.findByTestId("owner.open_button"));
    await user.click(await screen.findByTestId("admin.photos.tab"));

    const file = new File([new Uint8Array([9, 8, 7])], "song.mp3", {
      type: "audio/mpeg",
    });
    await user.upload(screen.getByTestId("owner.song.input"), file);

    await waitFor(() => {
      expect(actor.setSong).toHaveBeenCalledTimes(1);
    });
    const bytes = actor.setSong.mock.calls[0][0] as Uint8Array;
    expect(Array.from(bytes)).toEqual([9, 8, 7]);
    expect(await screen.findByTestId("admin.success_state")).toHaveTextContent(
      "Background song updated.",
    );
  });
});
