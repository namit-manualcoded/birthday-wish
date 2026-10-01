import App from "@/App";
import { PLACEHOLDER_CONTENT } from "@/lib/placeholder-content";
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

vi.mock("@caffeineai/core-infrastructure", () => ({
  useActor: vi.fn(),
  useInternetIdentity: vi.fn(),
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

/**
 * Replaces the fake Audio with one whose autoplay attempts reject, as a blocked
 * autoplay does, and whose later calls succeed like a user-initiated retry.
 *
 * The hook attempts autoplay on mount and again when the resolved song URL
 * arrives, so the first two calls are the blocked autoplay attempts; the
 * tap-to-play prompt's `start()` is the retry that succeeds.
 */
function installBlockedAudio(blockedAttempts = 2): { restore: () => void } {
  const Original = (globalThis as unknown as { Audio: new () => EventTarget })
    .Audio;
  class BlockedAudio extends (Original as unknown as {
    new (): EventTarget;
  }) {
    private attempts = 0;
    loop = false;
    preload = "";
    src = "";
    paused = true;
    volume = 1;
    play(): Promise<void> {
      this.attempts += 1;
      if (this.attempts <= blockedAttempts) {
        return Promise.reject(new DOMException("blocked", "NotAllowedError"));
      }
      this.paused = false;
      this.dispatchEvent(new Event("play"));
      return Promise.resolve();
    }
    pause(): void {
      this.paused = true;
      this.dispatchEvent(new Event("pause"));
    }
    load(): void {}
  }
  Object.defineProperty(globalThis, "Audio", {
    configurable: true,
    writable: true,
    value: BlockedAudio,
  });
  return {
    restore: () =>
      Object.defineProperty(globalThis, "Audio", {
        configurable: true,
        writable: true,
        value: Original,
      }),
  };
}

describe("public birthday site", () => {
  beforeEach(() => {
    setIdentity({});
  });

  it("renders the hero with the greeting and a scroll cue instead of a blank screen", async () => {
    const actor = createMockBackend({
      getSiteContent: makeSiteContent({
        greeting: {
          headline: "Happy Birthday, Ada",
          subtext: "A note just for you.",
          heroPhoto: undefined,
        },
      }),
    });
    setActor(actor);

    renderWithProviders(<App />);

    // The greeting is typewriter-revealed; reduced-motion is off in jsdom, so
    // wait for the full headline to appear.
    expect(
      await screen.findByText("Happy Birthday, Ada", undefined, {
        timeout: 4000,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("A note just for you.")).toBeInTheDocument();
    expect(screen.getByTestId("hero.scroll_cue")).toBeInTheDocument();
    expect(screen.getByTestId("hero.section")).toBeInTheDocument();
  });

  it("falls back to placeholder content while the backend is unavailable", async () => {
    setActor(null);

    renderWithProviders(<App />);

    expect(
      await screen.findByText(PLACEHOLDER_CONTENT.headline, undefined, {
        timeout: 4000,
      }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("hero.section")).toBeInTheDocument();
  });

  it("renders the accepted hero greeting 'Happy Birthday, Niti'", async () => {
    // The placeholder is what a fresh, live-but-empty backend shows, so this
    // pins the exact accepted greeting text rather than only the constant.
    expect(PLACEHOLDER_CONTENT.headline).toBe("Happy Birthday, Niti");

    setActor(null);
    renderWithProviders(<App />);

    expect(
      await screen.findByText("Happy Birthday, Niti", undefined, {
        timeout: 4000,
      }),
    ).toBeInTheDocument();
  });

  it("reveals each message section in order with its paired photo", async () => {
    const actor = createMockBackend({
      getSiteContent: makeSiteContent({
        messages: [
          {
            id: 2n,
            text: "Second note",
            photo: undefined,
            position: 1n,
          },
          {
            id: 1n,
            text: "First note",
            photo: undefined,
            position: 0n,
          },
        ],
      }),
    });
    setActor(actor);

    renderWithProviders(<App />);

    const first = await screen.findByTestId("message.item.1");
    const second = await screen.findByTestId("message.item.2");
    // The backend returns messages out of order; the hook sorts by position.
    expect(first).toHaveTextContent("First note");
    expect(second).toHaveTextContent("Second note");
    expect(screen.getByTestId("messages.section")).toBeInTheDocument();
  });

  it("falls back to sample messages when a live backend returns none", async () => {
    const actor = createMockBackend({
      getSiteContent: makeSiteContent({ messages: [] }),
    });
    setActor(actor);

    renderWithProviders(<App />);

    // A fresh, live-but-empty backend must still look complete.
    expect(await screen.findByTestId("message.item.1")).toBeInTheDocument();
    expect(screen.getByTestId("messages.section")).toBeInTheDocument();
  });

  it("renders the ambient hearts and confetti burst on first load", async () => {
    const actor = createMockBackend({ getSiteContent: makeSiteContent() });
    setActor(actor);

    const { container } = renderWithProviders(<App />);
    await screen.findByTestId("hero.section");

    // Both decorative layers are aria-hidden and rendered on the public site.
    const decorative = container.querySelectorAll('[aria-hidden="true"]');
    expect(decorative.length).toBeGreaterThan(0);
    // Confetti pieces are spans with the confetti animation class.
    expect(
      container.querySelectorAll(".animate-confetti-fall").length,
    ).toBeGreaterThan(0);
    expect(
      container.querySelectorAll(".animate-float-heart").length,
    ).toBeGreaterThan(0);
  });

  it("keeps the music control enabled when no song has been uploaded", async () => {
    const actor = createMockBackend({ getSiteContent: makeSiteContent() });
    setActor(actor);

    renderWithProviders(<App />);
    await screen.findByTestId("hero.section");

    // With no uploaded song the bundled default autoplays, so the control
    // reflects playing state while remaining enabled for the visitor.
    const toggle = screen.getByTestId("music.toggle");
    expect(toggle).toBeEnabled();
    await waitFor(() => {
      expect(toggle).toHaveAttribute("aria-label", "Pause background music");
    });
  });

  it("autoplays the background song on open and reflects playing state", async () => {
    const actor = createMockBackend({
      getSiteContent: makeSiteContent({ song: new Uint8Array([1, 2, 3]) }),
    });
    setActor(actor);

    renderWithProviders(<App />);

    // The song starts automatically on site open; no tap is required when the
    // browser permits autoplay.
    await waitFor(() => {
      expect(screen.getByTestId("music.toggle")).toHaveAttribute(
        "aria-label",
        "Pause background music",
      );
    });
    expect(screen.getByTestId("music.toggle")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.queryByTestId("music.start_button")).not.toBeInTheDocument();
  });

  it("shows a tap-to-play prompt when autoplay is blocked and starts on interaction", async () => {
    const user = userEvent.setup();
    const blocked = installBlockedAudio();
    try {
      const actor = createMockBackend({
        getSiteContent: makeSiteContent({ song: new Uint8Array([1, 2, 3]) }),
      });
      setActor(actor);

      renderWithProviders(<App />);

      // The blocked autoplay arms the prompt instead of leaving the site
      // claiming to play.
      const startButton = await screen.findByTestId("music.start_button");
      expect(screen.getByTestId("music.toggle")).toHaveAttribute(
        "aria-label",
        "Play background music",
      );

      await user.click(startButton);

      await waitFor(() => {
        expect(screen.getByTestId("music.toggle")).toHaveAttribute(
          "aria-label",
          "Pause background music",
        );
      });
      expect(screen.getByTestId("music.toggle")).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(
        screen.queryByTestId("music.start_button"),
      ).not.toBeInTheDocument();
    } finally {
      blocked.restore();
    }
  });

  it("keeps the music control visible while scrolling the page", async () => {
    const actor = createMockBackend({
      getSiteContent: makeSiteContent({ song: new Uint8Array([1, 2, 3]) }),
    });
    setActor(actor);

    renderWithProviders(<App />);
    await waitFor(() => {
      expect(screen.getByTestId("music.toggle")).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });

    // Scrolling the document must not unmount the single site-wide control.
    window.scrollTo(0, 2000);
    await waitFor(() => {
      expect(screen.getByTestId("music.toggle")).toBeInTheDocument();
    });
    expect(screen.getByTestId("music.toggle")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("offers owner sign in but no management panel to an anonymous visitor", async () => {
    const actor = createMockBackend({ getSiteContent: makeSiteContent() });
    setActor(actor);

    renderWithProviders(<App />);
    await screen.findByTestId("hero.section");

    expect(screen.getByTestId("auth.login_button")).toBeInTheDocument();
    expect(screen.queryByTestId("admin.page")).not.toBeInTheDocument();
    expect(screen.queryByTestId("owner.open_button")).not.toBeInTheDocument();
  });

  it("invokes Internet Identity login when the visitor clicks owner sign in", async () => {
    const user = userEvent.setup();
    const login = vi.fn();
    setIdentity({ login });
    const actor = createMockBackend({ getSiteContent: makeSiteContent() });
    setActor(actor);

    renderWithProviders(<App />);
    await user.click(await screen.findByTestId("auth.login_button"));

    expect(login).toHaveBeenCalledTimes(1);
  });
});
