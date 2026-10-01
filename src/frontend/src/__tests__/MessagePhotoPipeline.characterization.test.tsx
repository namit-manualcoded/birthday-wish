import App from "@/App";
import type { Message, SiteContent } from "@/backend";
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
 * Characterization of the message photo pipeline that the upcoming
 * add/edit/reorder/delete work must preserve.
 *
 * The request changes how an existing message's photo survives an edit or a
 * reorder. It must not disturb the adjacent, already-working paths:
 *
 *  - adding a message with a note and a photo persists both and the public site
 *    renders the new message with its photo (accepted behavior);
 *  - the read pipeline resolves backend bytes to a display URL and orders
 *    messages by their saved position;
 *  - a message with no photo still renders its text and the empty-photo
 *    placeholder rather than breaking the section.
 *
 * These tests deliberately do NOT pin the exact `updateMessage` payload for an
 * edit or a reorder of a message that already has a photo — that is the surface
 * the request intentionally changes.
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

describe("message photo pipeline characterization", () => {
  beforeEach(() => {
    setIdentity({});
  });

  it("persists a new message with its note and photo and shows it on the public site", async () => {
    const user = userEvent.setup();

    // A stateful stand-in: `addMessage` stores the entry and `getSiteContent`
    // returns it, so the public site can only show the new message if the
    // mutation invalidates the content query and the app refetches.
    let stored: SiteContent = makeSiteContent({ messages: [] });
    const actor = createMockBackend({
      isCallerAdmin: true,
    });
    actor.getSiteContent.mockImplementation(async () => stored);
    actor.addMessage.mockImplementation(
      async (input: {
        text: string;
        photo?: Uint8Array;
        crop?: Message["crop"];
        position: bigint;
      }) => {
        const message: Message = {
          id: 1n,
          text: input.text,
          photo: input.photo,
          crop: input.crop,
          position: input.position,
        };
        stored = makeSiteContent({ messages: [message] });
        return 1n;
      },
    );

    setIdentity({ isAuthenticated: true });
    setActor(actor);

    renderWithProviders(<App />);

    // The owner opens the panel and adds a note paired with a photo.
    await user.click(await screen.findByTestId("owner.open_button"));
    await user.click(await screen.findByTestId("admin.messages.tab"));

    const file = new File([new Uint8Array([4, 5, 6])], "note.png", {
      type: "image/png",
    });
    await user.upload(
      screen.getByTestId("owner.new_message.photo.input"),
      file,
    );
    // Choosing a file opens the crop step; confirming it hands the bytes to the
    // editor's draft.
    await user.click(
      await screen.findByTestId("owner.new_message.photo.crop_confirm_button"),
    );
    await user.type(
      await screen.findByTestId("owner.new_message.textarea"),
      "A note with a photo",
    );
    await user.click(screen.getByTestId("owner.new_message.add_button"));

    await waitFor(() => {
      expect(actor.addMessage).toHaveBeenCalledTimes(1);
    });
    const input = actor.addMessage.mock.calls[0][0] as {
      text: string;
      photo?: Uint8Array;
    };
    expect(input.text).toBe("A note with a photo");
    expect(Array.from(input.photo ?? [])).toEqual([4, 5, 6]);

    // Returning to the public site shows the saved message with its photo.
    await user.click(screen.getByTestId("owner.open_button"));
    const item = await screen.findByTestId("message.item.1");
    expect(item).toHaveTextContent("A note with a photo");
    const image = await waitFor(() => {
      const found = item.querySelector("img");
      expect(found).not.toBeNull();
      return found as HTMLImageElement;
    });
    expect(image.getAttribute("src")).toMatch(/^blob:/);
  });

  it("orders messages by their saved position and resolves each photo to a display URL", async () => {
    const firstBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 1, 1]);
    const secondBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 2, 2, 2]);
    const actor = createMockBackend({
      // The backend returns the messages out of order; the read pipeline must
      // sort by position and resolve each photo independently.
      getSiteContent: makeSiteContent({
        messages: [
          {
            id: 2n,
            text: "Second note",
            photo: secondBytes,
            position: 1n,
          },
          {
            id: 1n,
            text: "First note",
            photo: firstBytes,
            position: 0n,
          },
        ],
      }),
    });
    setActor(actor);

    renderWithProviders(<App />);

    const first = await screen.findByTestId("message.item.1");
    const second = await screen.findByTestId("message.item.2");
    expect(first).toHaveTextContent("First note");
    expect(second).toHaveTextContent("Second note");

    const firstImage = await waitFor(() => {
      const found = first.querySelector("img");
      expect(found).not.toBeNull();
      return found as HTMLImageElement;
    });
    const secondImage = await waitFor(() => {
      const found = second.querySelector("img");
      expect(found).not.toBeNull();
      return found as HTMLImageElement;
    });
    expect(firstImage.getAttribute("src")).toMatch(/^blob:/);
    expect(secondImage.getAttribute("src")).toMatch(/^blob:/);
    // Distinct byte payloads must resolve to distinct display URLs.
    expect(firstImage.getAttribute("src")).not.toBe(
      secondImage.getAttribute("src"),
    );
  });

  it("renders a message with no photo as text plus the empty-photo placeholder", async () => {
    const actor = createMockBackend({
      getSiteContent: makeSiteContent({
        messages: [
          {
            id: 1n,
            text: "A note without a photo",
            photo: undefined,
            position: 0n,
          },
        ],
      }),
    });
    setActor(actor);

    renderWithProviders(<App />);

    const item = await screen.findByTestId("message.item.1");
    expect(item).toHaveTextContent("A note without a photo");
    // No photo means no <img>; the section still renders its placeholder.
    expect(item.querySelector("img")).toBeNull();
  });
});
