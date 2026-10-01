import { AdminPage } from "@/pages/AdminPage";
import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import { screen, waitFor, within } from "@testing-library/react";
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

describe("owner management panel", () => {
  beforeEach(() => {
    setIdentity({});
  });

  it("gates the panel behind Internet Identity for an anonymous visitor", async () => {
    setActor(createMockBackend({ getSiteContent: makeSiteContent() }));

    renderWithProviders(<AdminPage />);

    expect(await screen.findByTestId("admin.gate")).toBeInTheDocument();
    expect(screen.getByTestId("admin.login_button")).toBeInTheDocument();
    expect(screen.queryByTestId("admin.page")).not.toBeInTheDocument();
  });

  it("tells a signed-in non-owner that the panel is owner-only", async () => {
    setIdentity({ isAuthenticated: true });
    setActor(
      createMockBackend({
        getSiteContent: makeSiteContent(),
        isCallerAdmin: false,
      }),
    );

    renderWithProviders(<AdminPage />);

    expect(await screen.findByTestId("admin.not_owner")).toBeInTheDocument();
    expect(screen.queryByTestId("admin.page")).not.toBeInTheDocument();
  });

  it("hints the accepted greeting in the owner headline placeholder", async () => {
    setIdentity({ isAuthenticated: true });
    setActor(
      createMockBackend({
        getSiteContent: makeSiteContent(),
        isCallerAdmin: true,
      }),
    );

    renderWithProviders(<AdminPage />);

    const headline = await screen.findByTestId("owner.greeting.headline_input");
    expect(headline).toHaveAttribute("placeholder", "Happy Birthday, Niti");
  });

  it("shows the editor to the owner and saves an edited greeting", async () => {
    const user = userEvent.setup();
    const actor = createMockBackend({
      getSiteContent: makeSiteContent({
        greeting: {
          headline: "Old headline",
          subtext: "Old subtext",
          heroPhoto: undefined,
        },
      }),
      isCallerAdmin: true,
      updateGreeting: {
        headline: "New headline",
        subtext: "New subtext",
        heroPhoto: undefined,
      },
    });
    setIdentity({ isAuthenticated: true });
    setActor(actor);

    renderWithProviders(<AdminPage />);

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
    expect(await screen.findByTestId("admin.success_state")).toHaveTextContent(
      "Greeting saved.",
    );
  });

  it("adds a message with its text and position", async () => {
    const user = userEvent.setup();
    const actor = createMockBackend({
      getSiteContent: makeSiteContent({ messages: [] }),
      isCallerAdmin: true,
      addMessage: 7n,
    });
    setIdentity({ isAuthenticated: true });
    setActor(actor);

    renderWithProviders(<AdminPage />);
    await user.click(await screen.findByTestId("admin.messages.tab"));

    const textarea = await screen.findByTestId("owner.new_message.textarea");
    await user.type(textarea, "A brand new note");
    await user.click(screen.getByTestId("owner.new_message.add_button"));

    await waitFor(() => {
      expect(actor.addMessage).toHaveBeenCalledWith({
        text: "A brand new note",
        position: 0n,
        photo: undefined,
      });
    });
    expect(await screen.findByTestId("admin.success_state")).toHaveTextContent(
      "Message added.",
    );
  });

  it("uploads a photo for a new message and persists the raw bytes", async () => {
    const user = userEvent.setup();
    const actor = createMockBackend({
      getSiteContent: makeSiteContent({ messages: [] }),
      isCallerAdmin: true,
      addMessage: 3n,
    });
    setIdentity({ isAuthenticated: true });
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
    // Choosing a file opens the crop & adjust step; the bytes are only handed
    // to the caller once the owner confirms the framing.
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
  });

  it("replaces an existing message's photo and persists the new bytes", async () => {
    const user = userEvent.setup();
    const actor = createMockBackend({
      getSiteContent: makeSiteContent({
        messages: [
          { id: 1n, text: "Original text", photo: undefined, position: 0n },
        ],
      }),
      isCallerAdmin: true,
      updateMessage: true,
    });
    setIdentity({ isAuthenticated: true });
    setActor(actor);

    renderWithProviders(<AdminPage />);
    await user.click(await screen.findByTestId("admin.messages.tab"));
    await user.click(await screen.findByTestId("owner.message.edit_button.1"));

    const file = new File([new Uint8Array([7, 8, 9])], "replacement.png", {
      type: "image/png",
    });
    await user.upload(screen.getByTestId("owner.message.photo.1.input"), file);
    // Confirm the crop step so the new bytes reach the editor's draft.
    await user.click(
      await screen.findByTestId("owner.message.photo.1.crop_confirm_button"),
    );
    await user.click(screen.getByTestId("owner.message.save_button.1"));

    await waitFor(() => {
      expect(actor.updateMessage).toHaveBeenCalledTimes(1);
    });
    const [id, input] = actor.updateMessage.mock.calls[0] as [
      bigint,
      { text: string; photo?: Uint8Array },
    ];
    expect(id).toBe(1n);
    expect(input.text).toBe("Original text");
    expect(Array.from(input.photo ?? [])).toEqual([7, 8, 9]);
  });

  it("edits an existing message's text", async () => {
    const user = userEvent.setup();
    const actor = createMockBackend({
      getSiteContent: makeSiteContent({
        messages: [
          { id: 1n, text: "Original text", photo: undefined, position: 0n },
        ],
      }),
      isCallerAdmin: true,
      updateMessage: true,
    });
    setIdentity({ isAuthenticated: true });
    setActor(actor);

    renderWithProviders(<AdminPage />);
    await user.click(await screen.findByTestId("admin.messages.tab"));
    await user.click(await screen.findByTestId("owner.message.edit_button.1"));

    const textarea = screen.getByTestId("owner.message.textarea.1");
    await user.clear(textarea);
    await user.type(textarea, "Edited text");
    await user.click(screen.getByTestId("owner.message.save_button.1"));

    await waitFor(() => {
      expect(actor.updateMessage).toHaveBeenCalledWith(1n, {
        text: "Edited text",
        position: 0n,
        photo: undefined,
      });
    });
  });

  it("reorders messages by swapping their positions", async () => {
    const user = userEvent.setup();
    const actor = createMockBackend({
      getSiteContent: makeSiteContent({
        messages: [
          { id: 1n, text: "First", photo: undefined, position: 0n },
          { id: 2n, text: "Second", photo: undefined, position: 1n },
        ],
      }),
      isCallerAdmin: true,
      updateMessage: true,
    });
    setIdentity({ isAuthenticated: true });
    setActor(actor);

    renderWithProviders(<AdminPage />);
    await user.click(await screen.findByTestId("admin.messages.tab"));
    await user.click(
      await screen.findByTestId("owner.message.move_down_button.1"),
    );

    await waitFor(() => {
      expect(actor.updateMessage).toHaveBeenCalledWith(1n, {
        text: "First",
        position: 1n,
        photo: undefined,
      });
      expect(actor.updateMessage).toHaveBeenCalledWith(2n, {
        text: "Second",
        position: 0n,
        photo: undefined,
      });
    });
  });

  it("deletes a message", async () => {
    const user = userEvent.setup();
    const actor = createMockBackend({
      getSiteContent: makeSiteContent({
        messages: [
          { id: 5n, text: "Delete me", photo: undefined, position: 0n },
        ],
      }),
      isCallerAdmin: true,
      deleteMessage: true,
    });
    setIdentity({ isAuthenticated: true });
    setActor(actor);

    renderWithProviders(<AdminPage />);
    await user.click(await screen.findByTestId("admin.messages.tab"));
    await user.click(
      await screen.findByTestId("owner.message.delete_button.1"),
    );

    await waitFor(() => {
      expect(actor.deleteMessage).toHaveBeenCalledWith(5n);
    });
    expect(await screen.findByTestId("admin.success_state")).toHaveTextContent(
      "Message deleted.",
    );
  });

  it("uploads a hero photo and persists the raw bytes", async () => {
    const user = userEvent.setup();
    const actor = createMockBackend({
      getSiteContent: makeSiteContent(),
      isCallerAdmin: true,
      setHeroPhoto: {
        headline: "Happy Birthday",
        subtext: "For you.",
        heroPhoto: undefined,
      },
    });
    setIdentity({ isAuthenticated: true });
    setActor(actor);

    renderWithProviders(<AdminPage />);
    await user.click(await screen.findByTestId("admin.photos.tab"));

    const file = new File([new Uint8Array([1, 2, 3])], "hero.png", {
      type: "image/png",
    });
    const input = screen.getByTestId("owner.hero_photo.input");
    await user.upload(input, file);

    // The crop & adjust step opens before anything is saved; confirming it
    // persists the bytes and the confirmed framing together.
    await user.click(
      await screen.findByTestId("owner.hero_photo.crop_confirm_button"),
    );

    await waitFor(() => {
      expect(actor.setHeroPhoto).toHaveBeenCalledTimes(1);
    });
    const bytes = actor.setHeroPhoto.mock.calls[0][0] as Uint8Array;
    expect(Array.from(bytes)).toEqual([1, 2, 3]);
    expect(actor.setHeroCrop).toHaveBeenCalledTimes(1);
    expect(await screen.findByTestId("admin.success_state")).toHaveTextContent(
      "Hero photo updated.",
    );
  });

  it("uploads a background song and persists the raw bytes", async () => {
    const user = userEvent.setup();
    const actor = createMockBackend({
      getSiteContent: makeSiteContent(),
      isCallerAdmin: true,
      setSong: new Uint8Array([9, 8, 7]),
    });
    setIdentity({ isAuthenticated: true });
    setActor(actor);

    renderWithProviders(<AdminPage />);
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

  it("surfaces an error when a save fails", async () => {
    const user = userEvent.setup();
    const actor = createMockBackend({
      getSiteContent: makeSiteContent({
        greeting: { headline: "Old", subtext: "Old", heroPhoto: undefined },
      }),
      isCallerAdmin: true,
    });
    actor.updateGreeting.mockRejectedValue(new Error("backend down"));
    setIdentity({ isAuthenticated: true });
    setActor(actor);

    renderWithProviders(<AdminPage />);

    const headline = await screen.findByTestId("owner.greeting.headline_input");
    await user.clear(headline);
    await user.type(headline, "Changed");
    await user.click(screen.getByTestId("owner.greeting.save_button"));

    expect(await screen.findByTestId("admin.error_state")).toHaveTextContent(
      "Could not save the greeting. Try again.",
    );
  });

  it("shows the owner's message list with reorder controls disabled at the ends", async () => {
    const user = userEvent.setup();
    const actor = createMockBackend({
      getSiteContent: makeSiteContent({
        messages: [
          { id: 1n, text: "First", photo: undefined, position: 0n },
          { id: 2n, text: "Second", photo: undefined, position: 1n },
        ],
      }),
      isCallerAdmin: true,
    });
    setIdentity({ isAuthenticated: true });
    setActor(actor);

    renderWithProviders(<AdminPage />);
    await user.click(await screen.findByTestId("admin.messages.tab"));

    const first = await screen.findByTestId("owner.message.item.1");
    const second = screen.getByTestId("owner.message.item.2");
    expect(
      within(first).getByTestId("owner.message.move_up_button.1"),
    ).toBeDisabled();
    expect(
      within(second).getByTestId("owner.message.move_down_button.2"),
    ).toBeDisabled();
  });
});
