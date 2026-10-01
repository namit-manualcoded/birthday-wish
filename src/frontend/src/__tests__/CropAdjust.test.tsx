import App from "@/App";
import { AdminPage } from "@/pages/AdminPage";
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
 * Cover for the crop & adjust step added to the owner photo flow and for the
 * public site rendering the saved adjustments.
 *
 * The accepted behavior is: choosing a photo opens a crop step with zoom,
 * reposition, and rotate before anything is saved; the confirmed adjustments
 * travel with the bytes to the backend; and the public site applies the saved
 * adjustments to the rendered photo. These tests drive the real CropEditor
 * through its accessible controls and assert the observable actor calls and
 * rendered transform.
 */

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

describe("owner crop & adjust step", () => {
  beforeEach(() => {
    setIdentity({ isAuthenticated: true });
  });

  it("opens the crop step after choosing a hero photo and persists the adjusted framing", async () => {
    const user = userEvent.setup();
    const actor = createMockBackend({
      getSiteContent: makeSiteContent(),
      isCallerAdmin: true,
    });
    setActor(actor);

    renderWithProviders(<AdminPage />);
    await user.click(await screen.findByTestId("admin.photos.tab"));

    const file = new File([new Uint8Array([1, 2, 3])], "hero.png", {
      type: "image/png",
    });
    await user.upload(screen.getByTestId("owner.hero_photo.input"), file);

    // The crop dialog opens before anything is saved.
    expect(
      await screen.findByTestId("owner.hero_photo.crop_dialog"),
    ).toBeInTheDocument();
    expect(actor.setHeroPhoto).not.toHaveBeenCalled();

    // Adjust the framing through the accessible controls: zoom in once and
    // rotate right once.
    await user.click(screen.getByTestId("owner.hero_photo.zoom_in_button"));
    await user.click(
      screen.getByTestId("owner.hero_photo.rotate_right_button"),
    );
    await user.click(
      screen.getByTestId("owner.hero_photo.crop_confirm_button"),
    );

    await waitFor(() => {
      expect(actor.setHeroPhoto).toHaveBeenCalledTimes(1);
      expect(actor.setHeroCrop).toHaveBeenCalledTimes(1);
    });

    const bytes = actor.setHeroPhoto.mock.calls[0][0] as Uint8Array;
    expect(Array.from(bytes)).toEqual([1, 2, 3]);

    const crop = actor.setHeroCrop.mock.calls[0][0] as {
      zoom: number;
      rotation: number;
    };
    expect(crop.zoom).toBeGreaterThan(1);
    expect(crop.rotation).toBeGreaterThan(0);
  });

  it("discards the selection when the owner cancels the crop step", async () => {
    const user = userEvent.setup();
    const actor = createMockBackend({
      getSiteContent: makeSiteContent(),
      isCallerAdmin: true,
    });
    setActor(actor);

    renderWithProviders(<AdminPage />);
    await user.click(await screen.findByTestId("admin.photos.tab"));

    const file = new File([new Uint8Array([1, 2, 3])], "hero.png", {
      type: "image/png",
    });
    await user.upload(screen.getByTestId("owner.hero_photo.input"), file);
    await user.click(
      await screen.findByTestId("owner.hero_photo.crop_cancel_button"),
    );

    // Cancelling must not persist anything.
    expect(actor.setHeroPhoto).not.toHaveBeenCalled();
    expect(actor.setHeroCrop).not.toHaveBeenCalled();
    expect(
      screen.queryByTestId("owner.hero_photo.crop_dialog"),
    ).not.toBeInTheDocument();
  });

  it("persists a new message photo's confirmed crop through addMessage", async () => {
    const user = userEvent.setup();
    const actor = createMockBackend({
      getSiteContent: makeSiteContent({ messages: [] }),
      isCallerAdmin: true,
      addMessage: 1n,
    });
    setActor(actor);

    renderWithProviders(<AdminPage />);
    await user.click(await screen.findByTestId("admin.messages.tab"));

    const file = new File([new Uint8Array([4, 5, 6])], "note.png", {
      type: "image/png",
    });
    await user.upload(
      screen.getByTestId("owner.new_message.photo.input"),
      file,
    );
    await user.click(
      await screen.findByTestId("owner.new_message.photo.zoom_in_button"),
    );
    await user.click(
      screen.getByTestId("owner.new_message.photo.crop_confirm_button"),
    );

    await user.type(
      await screen.findByTestId("owner.new_message.textarea"),
      "A framed note",
    );
    await user.click(screen.getByTestId("owner.new_message.add_button"));

    await waitFor(() => {
      expect(actor.addMessage).toHaveBeenCalledTimes(1);
    });
    const input = actor.addMessage.mock.calls[0][0] as {
      text: string;
      photo?: Uint8Array;
      crop?: { zoom: number };
    };
    expect(input.text).toBe("A framed note");
    expect(Array.from(input.photo ?? [])).toEqual([4, 5, 6]);
    expect(input.crop?.zoom).toBeGreaterThan(1);
  });
});

describe("public site renders saved crop adjustments", () => {
  beforeEach(() => {
    setIdentity({});
  });

  it("applies the saved hero crop transform to the rendered photo", async () => {
    const heroBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
    const actor = createMockBackend({
      getSiteContent: makeSiteContent({
        greeting: {
          headline: "Happy Birthday, Ada",
          subtext: "A note just for you.",
          heroPhoto: heroBytes,
          heroCrop: { zoom: 1.5, offsetX: 0.25, offsetY: -0.5, rotation: 30 },
        },
      }),
    });
    setActor(actor);

    renderWithProviders(<App />);
    await screen.findByTestId("hero.section");

    const heroImage = await screen.findByAltText(
      "Blush roses and peonies beside a lit candle and a wrapped gift in soft window light",
    );
    // The saved adjustments must reach the rendered transform, not just the
    // backend: the same normalized values reproduce the framing on the site.
    expect(heroImage.style.transform).toContain("scale(1.5)");
    expect(heroImage.style.transform).toContain("rotate(30deg)");
    expect(heroImage.style.transform).toContain("translate(25%, -50%)");
  });

  it("applies the saved message crop transform to the rendered photo", async () => {
    const photoBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 9, 9, 9]);
    const actor = createMockBackend({
      getSiteContent: makeSiteContent({
        messages: [
          {
            id: 1n,
            text: "A framed note",
            photo: photoBytes,
            crop: { zoom: 2, offsetX: 0, offsetY: 0, rotation: -45 },
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
    expect(image.style.transform).toContain("scale(2)");
    expect(image.style.transform).toContain("rotate(-45deg)");
  });
});
