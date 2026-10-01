import App from "@/App";
import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type MockBackend,
  createMockBackend,
  makeSiteContent,
  renderWithProviders,
} from "./test-utils";

/**
 * Characterization of the public site's photo rendering — the read side of the
 * photo pipeline that the upcoming crop/adjust work must preserve.
 *
 * The request adds a crop/adjust step to the owner upload flow and renders the
 * saved adjustments on the public site. It must not break the existing path by
 * which backend bytes become a visible image: a hero photo and a message photo
 * returned by `getSiteContent` must both render as an `<img>` with a resolved
 * object URL, without any manual refresh.
 *
 * These tests deliberately do NOT assert anything about the owner upload flow
 * (the reported bug) or about crop controls (the intentionally new behavior).
 */

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

describe("public site photo rendering characterization", () => {
  beforeEach(() => {
    setIdentity({});
  });

  it("renders the hero photo returned by the backend as a visible image", async () => {
    const heroBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
    const actor = createMockBackend({
      getSiteContent: makeSiteContent({
        greeting: {
          headline: "Happy Birthday, Ada",
          subtext: "A note just for you.",
          heroPhoto: heroBytes,
        },
      }),
    });
    setActor(actor);

    renderWithProviders(<App />);
    await screen.findByTestId("hero.section");

    // The backend returns raw bytes; the site must resolve them to a display
    // URL and render them, not fall back to the empty heart placeholder.
    const heroImage = await screen.findByAltText(
      "Blush roses and peonies beside a lit candle and a wrapped gift in soft window light",
    );
    expect(heroImage).toBeVisible();
    expect(heroImage.getAttribute("src")).toMatch(/^blob:/);
  });

  it("renders a message photo returned by the backend as a visible image", async () => {
    const photoBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 9, 9, 9]);
    const actor = createMockBackend({
      getSiteContent: makeSiteContent({
        messages: [
          {
            id: 1n,
            text: "A note with a photo",
            photo: photoBytes,
            position: 0n,
          },
        ],
      }),
    });
    setActor(actor);

    renderWithProviders(<App />);

    const item = await screen.findByTestId("message.item.1");
    const image = await waitFor(() => {
      const found = item.querySelector("img");
      expect(found).not.toBeNull();
      return found as HTMLImageElement;
    });
    // The message section animates in via `whileInView`; the IntersectionObserver
    // stub never fires, so assert the resolved source rather than animation state.
    expect(image.getAttribute("src")).toMatch(/^blob:/);
  });

  it("keeps the bundled hero placeholder when the backend has no hero photo", async () => {
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
    await screen.findByTestId("hero.section");

    // With no uploaded photo the site falls back to the bundled placeholder
    // asset, not a resolved blob URL. This pins the empty-state branch the crop
    // work must not disturb.
    const heroImage = await screen.findByAltText(
      "Blush roses and peonies beside a lit candle and a wrapped gift in soft window light",
    );
    expect(heroImage.getAttribute("src")).toBe(
      "/assets/generated/hero-birthday.dim_1200x1600.jpg",
    );
  });
});
