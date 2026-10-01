import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Generated components expose stable `data-ocid` hooks rather than
// `data-testid`; point Testing Library's test-id queries at them.
configure({ testIdAttribute: "data-ocid" });

// jsdom does not implement the object-URL APIs the app uses to turn backend
// bytes into displayable image/audio URLs. Provide deterministic stubs so tests
// can assert on the resolved URL without a real Blob URL registry.
if (typeof URL.createObjectURL !== "function") {
  let counter = 0;
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    writable: true,
    value: vi.fn(() => `blob:mock-${++counter}`),
  });
}
if (typeof URL.revokeObjectURL !== "function") {
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    writable: true,
    value: vi.fn(),
  });
}

// jsdom has no ResizeObserver, which Radix's size-aware primitives (the crop
// editor's slider) read on mount. A no-op stub keeps those components mounted
// without asserting on measured geometry.
if (typeof globalThis.ResizeObserver !== "function") {
  class MockResizeObserver implements ResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  Object.defineProperty(globalThis, "ResizeObserver", {
    configurable: true,
    writable: true,
    value: MockResizeObserver,
  });
}

// jsdom has no IntersectionObserver, which motion's `whileInView` uses. A stub
// that never fires keeps scroll-reveal components mounted without asserting on
// animation timing.
if (typeof globalThis.IntersectionObserver !== "function") {
  class MockIntersectionObserver implements IntersectionObserver {
    readonly root: Element | Document | null = null;
    readonly rootMargin: string = "";
    readonly thresholds: ReadonlyArray<number> = [];
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  Object.defineProperty(globalThis, "IntersectionObserver", {
    configurable: true,
    writable: true,
    value: MockIntersectionObserver,
  });
}

// jsdom's HTMLMediaElement has no real playback: `play()` returns undefined and
// `load()` throws "Not implemented". The music hook owns a single `new Audio()`
// and relies on the element's own `play`/`pause` events to track state, so
// replace the constructor with a small fake that behaves like a media element
// without a pipeline.
class FakeAudio extends EventTarget {
  loop = false;
  preload = "";
  src = "";
  paused = true;
  currentTime = 0;
  volume = 1;

  play(): Promise<void> {
    this.paused = false;
    this.dispatchEvent(new Event("play"));
    return Promise.resolve();
  }

  pause(): void {
    if (this.paused) return;
    this.paused = true;
    this.dispatchEvent(new Event("pause"));
  }

  load(): void {}
}

Object.defineProperty(globalThis, "Audio", {
  configurable: true,
  writable: true,
  value: FakeAudio,
});

// jsdom's Blob/File predate the `arrayBuffer()`/`text()` helpers the upload
// fields use to read a chosen file into bytes. Polyfill them from the Blob's
// own parts so uploads exercise the real read path.
if (typeof Blob.prototype.arrayBuffer !== "function") {
  Object.defineProperty(Blob.prototype, "arrayBuffer", {
    configurable: true,
    writable: true,
    value(this: Blob): Promise<ArrayBuffer> {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(this);
      });
    },
  });
}
if (typeof Blob.prototype.text !== "function") {
  Object.defineProperty(Blob.prototype, "text", {
    configurable: true,
    writable: true,
    value(this: Blob): Promise<string> {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(this);
      });
    },
  });
}

// jsdom does not implement scrolling; the app only needs it not to throw.
Object.defineProperty(window, "scrollTo", {
  configurable: true,
  writable: true,
  value: vi.fn(),
});

afterEach(() => {
  cleanup();
});
