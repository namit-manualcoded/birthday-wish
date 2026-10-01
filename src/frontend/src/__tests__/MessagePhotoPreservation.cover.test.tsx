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
 * Cover for the accepted behavior that an existing message's photo survives an
 * edit, a reorder, and a re-crop.
 *
 * The backend's `updateMessage` replaces the whole record, so the editor must
 * re-send the untouched photo bytes on every write, and a re-crop of an
 * already-saved photo must go through the dedicated `setMessageCrop` endpoint
 * rather than a full-record write that could clear the bytes.
 *
 * These tests assert the observable actor calls the app makes; the backend is a
 * typed local mock, so they prove the frontend contract, not canister behavior.
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

const PHOTO_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 7, 7, 7]);

describe("message photo preservation", () => {
  beforeEach(() => {
    setIdentity({ isAuthenticated: true });
  });

  it("keeps an existing photo when the owner edits only the note text", async () => {
    const user = userEvent.setup();
    const actor = createMockBackend({
      getSiteContent: makeSiteContent({
        messages: [
          {
            id: 1n,
            text: "Original text",
            photo: PHOTO_BYTES,
            position: 0n,
          },
        ],
      }),
      isCallerAdmin: true,
      updateMessage: true,
    });
    setActor(actor);

    renderWithProviders(<AdminPage />);
    await user.click(await screen.findByTestId("admin.messages.tab"));
    await user.click(await screen.findByTestId("owner.message.edit_button.1"));

    const textarea = screen.getByTestId("owner.message.textarea.1");
    await user.clear(textarea);
    await user.type(textarea, "Edited text");
    await user.click(screen.getByTestId("owner.message.save_button.1"));

    await waitFor(() => {
      expect(actor.updateMessage).toHaveBeenCalledTimes(1);
    });
    const [id, input] = actor.updateMessage.mock.calls[0] as [
      bigint,
      { text: string; photo?: Uint8Array },
    ];
    expect(id).toBe(1n);
    expect(input.text).toBe("Edited text");
    // The untouched photo must be re-sent, not dropped.
    expect(Array.from(input.photo ?? [])).toEqual(Array.from(PHOTO_BYTES));
  });

  it("keeps each message's photo when the owner reorders them", async () => {
    const user = userEvent.setup();
    const firstBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 1, 1]);
    const secondBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 2, 2, 2]);
    const actor = createMockBackend({
      getSiteContent: makeSiteContent({
        messages: [
          { id: 1n, text: "First", photo: firstBytes, position: 0n },
          { id: 2n, text: "Second", photo: secondBytes, position: 1n },
        ],
      }),
      isCallerAdmin: true,
      updateMessage: true,
    });
    setActor(actor);

    renderWithProviders(<AdminPage />);
    await user.click(await screen.findByTestId("admin.messages.tab"));
    await user.click(
      await screen.findByTestId("owner.message.move_down_button.1"),
    );

    await waitFor(() => {
      expect(actor.updateMessage).toHaveBeenCalledTimes(2);
    });
    const calls = actor.updateMessage.mock.calls as Array<
      [bigint, { text: string; position: bigint; photo?: Uint8Array }]
    >;
    const first = calls.find(([id]) => id === 1n);
    const second = calls.find(([id]) => id === 2n);
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    // Swapped positions, but each message keeps its own photo bytes.
    expect(first?.[1].position).toBe(1n);
    expect(Array.from(first?.[1].photo ?? [])).toEqual(Array.from(firstBytes));
    expect(second?.[1].position).toBe(0n);
    expect(Array.from(second?.[1].photo ?? [])).toEqual(
      Array.from(secondBytes),
    );
  });

  it("persists a re-crop of an already-saved photo through setMessageCrop without wiping the photo", async () => {
    const user = userEvent.setup();
    const actor = createMockBackend({
      getSiteContent: makeSiteContent({
        messages: [
          {
            id: 1n,
            text: "A framed note",
            photo: PHOTO_BYTES,
            crop: { zoom: 1, offsetX: 0, offsetY: 0, rotation: 0 },
            position: 0n,
          },
        ],
      }),
      isCallerAdmin: true,
      setMessageCrop: true,
      updateMessage: true,
    });
    setActor(actor);

    renderWithProviders(<AdminPage />);
    await user.click(await screen.findByTestId("admin.messages.tab"));
    await user.click(await screen.findByTestId("owner.message.edit_button.1"));

    // Re-open the crop step for the photo that is already saved. No new file is
    // chosen, so the bytes are unchanged and only the crop should be persisted.
    await user.click(
      await screen.findByTestId("owner.message.photo.1.crop_button"),
    );
    await user.click(
      await screen.findByTestId("owner.message.photo.1.zoom_in_button"),
    );
    await user.click(
      screen.getByTestId("owner.message.photo.1.crop_confirm_button"),
    );

    await waitFor(() => {
      expect(actor.setMessageCrop).toHaveBeenCalledTimes(1);
    });
    const [id, crop] = actor.setMessageCrop.mock.calls[0] as [
      bigint,
      { zoom: number },
    ];
    expect(id).toBe(1n);
    expect(crop.zoom).toBeGreaterThan(1);
    // A re-crop must not go through the replace-style update, which would send
    // the photo bytes again and risk clearing them.
    expect(actor.updateMessage).not.toHaveBeenCalled();
    expect(await screen.findByTestId("admin.success_state")).toHaveTextContent(
      "Message photo crop saved.",
    );
  });
});
