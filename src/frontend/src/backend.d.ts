import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Cell {
    value: Value;
    name: string;
}
export interface CropAdjust {
    rotation: number;
    zoom: number;
    offsetX: number;
    offsetY: number;
}
export type Error_ = {
    __kind__: "FrontendOriginsNotConfigured";
    FrontendOriginsNotConfigured: null;
} | {
    __kind__: "MixedSsoSources";
    MixedSsoSources: {
        otherKeys: Array<string>;
        ssoKeys: Array<string>;
    };
} | {
    __kind__: "Stale";
    Stale: {
        ageNs: bigint;
    };
} | {
    __kind__: "MalformedCandid";
    MalformedCandid: null;
} | {
    __kind__: "AmbiguousAttribute";
    AmbiguousAttribute: {
        field: string;
        sources: Array<string>;
    };
} | {
    __kind__: "NoAttributes";
    NoAttributes: null;
} | {
    __kind__: "UnknownNonce";
    UnknownNonce: null;
} | {
    __kind__: "UntrustedSsoSource";
    UntrustedSsoSource: {
        domain: string;
    };
} | {
    __kind__: "MissingField";
    MissingField: string;
} | {
    __kind__: "FrontendOriginMismatch";
    FrontendOriginMismatch: {
        got: string;
        expected: Array<string>;
    };
};
export interface Greeting {
    subtext: string;
    headline: string;
    heroCrop?: CropAdjust;
    heroPhoto?: StoredFile;
}
export interface GreetingInput {
    subtext: string;
    headline: string;
}
export interface Message {
    id: MessageId;
    crop?: CropAdjust;
    text: string;
    photo?: StoredFile;
    position: bigint;
}
export type MessageId = bigint;
export interface MessageInput {
    crop?: CropAdjust;
    text: string;
    photo?: StoredFile;
    position: bigint;
}
export interface Result {
    hasMore: boolean;
    rows: Array<Array<Cell>>;
}
export type Result__1 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: Error_;
};
export interface SiteContent {
    messages: Array<Message>;
    song?: StoredFile;
    greeting: Greeting;
    songSource: SongSource;
}
export interface SongSource {
    url?: string;
    file?: StoredFile;
    kind: SongSourceKind;
}
export type StoredFile = Uint8Array;
export type Value = {
    __kind__: "int";
    int: bigint;
} | {
    __kind__: "nat";
    nat: bigint;
} | {
    __kind__: "float";
    float: number;
} | {
    __kind__: "bool";
    bool: boolean;
} | {
    __kind__: "null";
    null: null;
} | {
    __kind__: "text";
    text: string;
};
export enum SongSourceKind {
    url = "url",
    upload = "upload",
    default = "default"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    /**
     * / Owner-only: add a message entry.
     */
    addMessage(input: MessageInput): Promise<MessageId>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    /**
     * / Owner-only: clear the external audio URL, reverting to the uploaded song.
     */
    clearSongUrl(): Promise<SongSource>;
    /**
     * / Owner-only: delete a message entry.
     */
    deleteMessage(id: MessageId): Promise<boolean>;
    execute(qJson: string): Promise<Result>;
    /**
     * / Returns static Markdown documentation for this backend's public API.
     */
    getApiDoc(): Promise<string>;
    getCallerUserRole(): Promise<UserRole>;
    /**
     * / Public read of all site content.
     */
    getSiteContent(): Promise<SiteContent>;
    /**
     * / Public read of the active background song source.
     */
    getSongSource(): Promise<SongSource>;
    isCallerAdmin(): Promise<boolean>;
    schema(): Promise<string>;
    /**
     * / Owner-only: save crop/adjust parameters for the hero photo.
     */
    setHeroCrop(crop: CropAdjust): Promise<boolean>;
    /**
     * / Owner-only: set or replace the hero photo.
     */
    setHeroPhoto(photo: StoredFile): Promise<Greeting>;
    /**
     * / Owner-only: save crop/adjust parameters for a message's photo.
     */
    setMessageCrop(id: MessageId, crop: CropAdjust): Promise<boolean>;
    /**
     * / Owner-only: set or replace the background song.
     */
    setSong(file: StoredFile): Promise<StoredFile>;
    /**
     * / Owner-only: set the external audio URL for the background song.
     */
    setSongUrl(url: string): Promise<SongSource>;
    /**
     * / Owner-only: update the greeting headline and subtext.
     */
    updateGreeting(input: GreetingInput): Promise<Greeting>;
    /**
     * / Owner-only: update a message entry.
     */
    updateMessage(id: MessageId, input: MessageInput): Promise<boolean>;
}
