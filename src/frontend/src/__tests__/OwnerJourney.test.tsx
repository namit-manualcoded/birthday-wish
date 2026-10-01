import App from "@/App";
import type { SiteContent } from "@/backend";
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

// The upload fields build an `ExternalBlob` from the chosen file. The real
// class talks to platform object storage; a local stand-in keeps the upload
// journey deterministic while preserving the bytes the app hands to the actor.
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

describe("owner editing journey", () => {
  beforeEach(() => {
    setIdentity({});
  });

  it("reflects a saved greeting on the public site after the owner edits it", async () => {
    const user = userEvent.setup();

    // The backend starts with the old greeting and returns the new one once the
    // owner saves, so the public site can only show the change if the mutation
    // invalidates the content query and the app refetches.
    let stored: SiteContent = makeSiteContent({
      greeting: {
        headline: "Old headline",
        subtext: "Old subtext",
        heroPhoto: undefined,
      },
    });
    const actor = createMockBackend({
      isCallerAdmin: true,
      updateGreeting: {
        headline: "New headline",
        subtext: "New subtext",
        heroPhoto: undefined,
      },
    });
    actor.getSiteContent.mockImplementation(async () => stored);
    actor.updateGreeting.mockImplementation(async () => {
      stored = makeSiteContent({
        greeting: {
          headline: "New headline",
          subtext: "New subtext",
          heroPhoto: undefined,
        },
      });
      return stored.greeting;
    });

    setIdentity({ isAuthenticated: true });
    setActor(actor);

    renderWithProviders(<App />);

    // The owner opens the panel from the public site.
    await user.click(await screen.findByTestId("owner.open_button"));
    const headline = await screen.findByTestId("owner.greeting.headline_input");
    await user.clear(headline);
    await user.type(headline, "New headline");
    const subtext = screen.getByTestId("owner.greeting.subtext_input");
    await user.clear(subtext);
    await user.type(subtext, "New subtext");
    await user.click(screen.getByTestId("owner.greeting.save_button"));

    await waitFor(() => {
      expect(actor.updateGreeting).toHaveBeenCalledWith({
        headline: "New headline",
        subtext: "New subtext",
      });
    });

    // Returning to the public site shows the saved greeting, not the old one.
    await user.click(screen.getByTestId("owner.open_button"));
    expect(
      await screen.findByText("New headline", undefined, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Old headline")).not.toBeInTheDocument();
  });

  it("shows upload progress while a hero photo upload is in flight", async () => {
    const user = userEvent.setup();
    const actor = createMockBackend({
      getSiteContent: makeSiteContent(),
      isCallerAdmin: true,
    });
    // Keep the mutation pending so the progress affordance stays mounted.
    actor.setHeroPhoto.mockImplementation(() => new Promise(() => {}));
    setIdentity({ isAuthenticated: true });
    setActor(actor);

    renderWithProviders(<App />);
    await user.click(await screen.findByTestId("owner.open_button"));
    await user.click(await screen.findByTestId("admin.photos.tab"));

    const file = new File([new Uint8Array([1, 2, 3])], "hero.png", {
      type: "image/png",
    });
    await user.upload(screen.getByTestId("owner.hero_photo.input"), file);

    // The crop & adjust step opens first; confirming it starts the upload, and
    // the progress affordance stays mounted while the mutation is pending.
    await user.click(
      await screen.findByTestId("owner.hero_photo.crop_confirm_button"),
    );

    expect(
      await screen.findByTestId("owner.hero_photo.progress"),
    ).toBeInTheDocument();
  });

  it("keeps the management panel hidden from a signed-in non-owner", async () => {
    const actor = createMockBackend({
      getSiteContent: makeSiteContent(),
      isCallerAdmin: false,
    });
    setIdentity({ isAuthenticated: true });
    setActor(actor);

    renderWithProviders(<App />);
    await screen.findByTestId("hero.section");

    // A signed-in non-owner gets a sign-out action, never the edit entry point.
    expect(screen.getByTestId("auth.logout_button")).toBeInTheDocument();
    expect(screen.queryByTestId("owner.open_button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("admin.page")).not.toBeInTheDocument();
  });
});
