import { PocketIc, createIdentity } from "@dfinity/pic";
import type { Actor, CanisterFixture } from "@dfinity/pic";
import { afterAll, beforeAll, expect, it } from "vitest";

import { idlFactory } from "../../src/frontend/src/declarations/backend.did.js";
import type { _SERVICE } from "../../src/frontend/src/declarations/backend.did";

const PIC_URL = process.env.POCKET_IC_URL ?? "";
const BACKEND_WASM = process.env.BACKEND_WASM ?? "";

let pic: PocketIc | undefined;
let canisterId: CanisterFixture<_SERVICE>["canisterId"];
/** The owner actor: the first caller to bootstrap access control. */
let owner: Actor<_SERVICE>;

beforeAll(async () => {
  pic = await PocketIc.create(PIC_URL);
  ({ canisterId } = await pic.setupCanister<_SERVICE>({
    idlFactory,
    wasm: BACKEND_WASM,
  }));

  // The first caller to initialize access control becomes the owner. This is
  // the same bootstrap the app's sign-in flow performs, so every write below
  // runs as the real owner rather than an unregistered principal.
  owner = pic.createActor<_SERVICE>(idlFactory, canisterId);
  owner.setIdentity(createIdentity("owner"));
  await owner._initialize_access_control();
});

afterAll(async () => {
  await pic?.tearDown();
});

it("answers an empty-state read instead of trapping", async () => {
  const content = await owner.getSiteContent();
  expect(content.messages).toEqual([]);
  expect(content.song).toEqual([]);
  expect(content.greeting.headline).toBe("");
  expect(content.greeting.subtext).toBe("");
  expect(content.greeting.heroPhoto).toEqual([]);
});

it("round-trips a message through the real canister", async () => {
  const id = await owner.addMessage({
    text: "Round-trip note",
    position: 0n,
    photo: [],
    crop: [],
  });
  expect(id).toBe(0n);

  const content = await owner.getSiteContent();
  expect(content.messages).toHaveLength(1);
  expect(content.messages[0]).toMatchObject({
    id: 0n,
    text: "Round-trip note",
    position: 0n,
  });
});

it("orders messages by position regardless of insertion order", async () => {
  // A dedicated canister keeps this test's ordering assertion independent of
  // whatever the other tests have already written.
  const { canisterId: freshId } = await pic!.setupCanister<_SERVICE>({
    idlFactory,
    wasm: BACKEND_WASM,
  });
  const freshOwner = pic!.createActor<_SERVICE>(idlFactory, freshId);
  freshOwner.setIdentity(createIdentity("ordering-owner"));
  await freshOwner._initialize_access_control();

  const second = await freshOwner.addMessage({
    text: "Second note",
    position: 1n,
    photo: [],
    crop: [],
  });
  const first = await freshOwner.addMessage({
    text: "First note",
    position: 0n,
    photo: [],
    crop: [],
  });

  const content = await freshOwner.getSiteContent();
  const ordered = content.messages.map((message) => message.text);
  expect(ordered).toEqual(["First note", "Second note"]);
  expect(second).toBe(0n);
  expect(first).toBe(1n);
});

it("updates and deletes a message through the real canister", async () => {
  const id = await owner.addMessage({
    text: "Original",
    position: 5n,
    photo: [],
    crop: [],
  });

  await expect(
    owner.updateMessage(id, {
      text: "Edited",
      position: 5n,
      photo: [],
      crop: [],
    }),
  ).resolves.toBe(true);
  const afterUpdate = await owner.getSiteContent();
  expect(
    afterUpdate.messages.find((message) => message.id === id)?.text,
  ).toBe("Edited");

  await expect(owner.deleteMessage(id)).resolves.toBe(true);
  const afterDelete = await owner.getSiteContent();
  expect(afterDelete.messages.some((message) => message.id === id)).toBe(false);
});

it("returns false when updating or deleting an unknown message", async () => {
  await expect(
    owner.updateMessage(9999n, {
      text: "ghost",
      position: 0n,
      photo: [],
      crop: [],
    }),
  ).resolves.toBe(false);
  await expect(owner.deleteMessage(9999n)).resolves.toBe(false);
});

it("persists the greeting, hero photo, and song bytes", async () => {
  const greeting = await owner.updateGreeting({
    headline: "Happy Birthday, Ada",
    subtext: "A note just for you.",
  });
  expect(greeting.headline).toBe("Happy Birthday, Ada");
  expect(greeting.subtext).toBe("A note just for you.");

  const heroBytes = new Uint8Array([1, 2, 3, 4]);
  const withHero = await owner.setHeroPhoto(heroBytes);
  expect(withHero.heroPhoto).toEqual([heroBytes]);

  const songBytes = new Uint8Array([9, 8, 7]);
  await expect(owner.setSong(songBytes)).resolves.toEqual(songBytes);

  // The public read must reflect every saved change, not just the return value.
  const content = await owner.getSiteContent();
  expect(content.greeting.headline).toBe("Happy Birthday, Ada");
  expect(content.greeting.subtext).toBe("A note just for you.");
  expect(content.greeting.heroPhoto).toEqual([heroBytes]);
  expect(content.song).toEqual([songBytes]);
});

it("round-trips a message photo through the real canister", async () => {
  const photoBytes = new Uint8Array([11, 22, 33, 44]);
  const id = await owner.addMessage({
    text: "Note with a photo",
    position: 0n,
    photo: [photoBytes],
    crop: [],
  });

  const content = await owner.getSiteContent();
  const stored = content.messages.find((message) => message.id === id);
  expect(stored?.photo).toEqual([photoBytes]);
});

it("persists crop adjustments for the hero and a message photo", async () => {
  // Both crop setters require a photo to exist, so seed them explicitly rather
  // than depending on what earlier tests wrote.
  await owner.setHeroPhoto(new Uint8Array([1, 2, 3]));
  const heroCrop = { zoom: 1.5, offsetX: 0.25, offsetY: -0.5, rotation: 30 };
  await expect(owner.setHeroCrop(heroCrop)).resolves.toBe(true);

  const messageCrop = { zoom: 2, offsetX: 0, offsetY: 0, rotation: -45 };
  const id = await owner.addMessage({
    text: "Cropped note",
    position: 0n,
    photo: [new Uint8Array([4, 5, 6])],
    crop: [],
  });
  await expect(owner.setMessageCrop(id, messageCrop)).resolves.toBe(true);

  // The public read must return the saved adjustments, not just accept them.
  const content = await owner.getSiteContent();
  expect(content.greeting.heroCrop).toEqual([heroCrop]);
  const stored = content.messages.find((message) => message.id === id);
  expect(stored?.crop).toEqual([messageCrop]);
});

it("keeps photos and song after a fresh actor re-reads the canister", async () => {
  // Seed through the owner actor, then read through a brand-new actor on the
  // same canister. That models a page reload: the bytes must come back from
  // canister state, not from anything cached in the writing actor.
  const heroBytes = new Uint8Array([21, 22, 23]);
  const songBytes = new Uint8Array([31, 32, 33]);
  await owner.setHeroPhoto(heroBytes);
  await owner.setSong(songBytes);

  const reloaded = pic!.createActor<_SERVICE>(idlFactory, canisterId);
  reloaded.setIdentity(createIdentity("owner"));

  const content = await reloaded.getSiteContent();
  expect(content.greeting.heroPhoto).toEqual([heroBytes]);
  expect(content.song).toEqual([songBytes]);
});

it("makes the first caller the owner and rejects a different caller", async () => {
  await expect(owner.isCallerAdmin()).resolves.toBe(true);

  const stranger = pic!.createActor<_SERVICE>(idlFactory, canisterId);
  stranger.setIdentity(createIdentity("stranger"));

  // A caller who never bootstrapped access control is not registered, so the
  // owner-only write is rejected rather than silently accepted.
  await expect(
    stranger.updateGreeting({ headline: "hijacked", subtext: "nope" }),
  ).rejects.toThrow();

  // The public read stays available to that same caller.
  await expect(stranger.getSiteContent()).resolves.toBeDefined();
});
