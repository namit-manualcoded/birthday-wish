import type { SiteContent, backendInterface } from "@/backend";
import { SongSourceKind } from "@/backend";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type RenderResult, render } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { vi } from "vitest";

/**
 * A typed local stand-in for the generated backend actor. Every method the
 * frontend consumes is present so a test can assert on the exact call the app
 * makes; nothing here talks to a network or a real canister.
 */
export type MockBackend = {
  [K in keyof backendInterface]: ReturnType<typeof vi.fn>;
};

export function createMockBackend(
  overrides: Partial<Record<keyof backendInterface, unknown>> = {},
): MockBackend {
  const base: Record<string, ReturnType<typeof vi.fn>> = {
    getSiteContent: vi.fn(),
    getSongSource: vi.fn(),
    isCallerAdmin: vi.fn().mockResolvedValue(false),
    updateGreeting: vi.fn(),
    setHeroPhoto: vi.fn(),
    setHeroCrop: vi.fn(),
    addMessage: vi.fn(),
    updateMessage: vi.fn(),
    setMessageCrop: vi.fn(),
    deleteMessage: vi.fn(),
    setSong: vi.fn(),
  };
  for (const [key, value] of Object.entries(overrides)) {
    base[key] = vi.fn().mockResolvedValue(value);
  }
  return base as unknown as MockBackend;
}

/** A minimal, valid `SiteContent` payload with no photos or song. */
export function makeSiteContent(
  overrides: Partial<SiteContent> = {},
): SiteContent {
  return {
    greeting: {
      headline: "Happy Birthday",
      subtext: "For you.",
      heroPhoto: undefined,
    },
    messages: [],
    song: undefined,
    songSource: { kind: SongSourceKind.default },
    ...overrides,
  };
}

export interface RenderOptions {
  /** The mock actor returned by `useActor`. */
  actor?: MockBackend | null;
  /** Internet Identity state returned by `useInternetIdentity`. */
  identity?: {
    isAuthenticated?: boolean;
    isLoggingIn?: boolean;
    login?: () => void;
    clear?: () => void;
  };
}

/**
 * Renders a component inside a fresh React Query client. The core-infrastructure
 * hooks are mocked by each test file via `vi.mock`; this helper only supplies the
 * query provider the app's hooks require.
 */
export function renderWithProviders(
  ui: ReactElement,
  { queryClient }: { queryClient?: QueryClient } = {},
): RenderResult {
  const client =
    queryClient ??
    new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0, staleTime: 0 },
        mutations: { retry: false },
      },
    });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(ui, { wrapper: Wrapper });
}
