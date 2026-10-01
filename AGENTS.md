# Project Guidance

## User Preferences

- Romantic, elegant visual style with soft colors and polished motion
- Rich animations throughout: fade-ins, parallax, floating hearts and confetti, typewriter text, smooth transitions
- A single background song plays continuously across the whole site with a visible play/pause control
- Background song starts at maximum volume with a visible volume slider
- Owner panel lets the owner set the background song by pasting a direct audio URL or uploading a file
- All site content (photos, greeting, messages, song) is editable from an in-app owner panel rather than hardcoded
- Hero greeting reads 'Happy Birthday, Niti'
- Footer shows 'Coded by Namit' with 'Namit' bold; no Caffeine attribution in the footer
- Uploaded photos (hero and messages) support crop and adjust: zoom, drag-to-reposition, and rotate, with saved adjustments rendered on the public site
- Background song autoplays on site open and loops continuously, with a tap-to-play fallback when the browser blocks autoplay

## Verified Commands

- **typecheck**: `mops check --fix`
- **build**: `mops build`

## Learnings

- This project uses the ENHANCED migration chain: the pending init migration's NewActor must enumerate every stable field declared in main.mo, and migration files inline all types.
- Mutable stable state must be a { var value : T } cell; an immutable `let` record cannot be updated by a lib function that only returns a new record.
- Platform object storage requires both the caffeineai-object-storage mops dependency + include MixinObjectStorage() and Storage.ExternalBlob-typed fields; bindgen maps StoredFile to Uint8Array, so the frontend passes raw bytes and renders blobs via object URLs.
- A `data ?? PLACEHOLDER` fallback never fires against a live-but-empty backend; merge per-field so a fresh site still looks complete.
- Browsers block autoplay, so a music control must ship a bundled default song and stay enabled.
- Motoko has no triple-quoted multi-line string literal; Array/Iter/List .sort takes its comparator as an implicit argument: sort(func(a, b) = ...).
- OQL manual mode requires top-level imports of MapEntity and the <Type>Value modules; Map.Map.toEntityManual takes two type arguments.
- The visible hero headline comes from PLACEHOLDER_CONTENT.headline because withPlaceholderFallback merges per-field, so a live-but-empty backend still shows the fallback greeting.
- Footer attribution lives in components/Layout.tsx; removing the anchor also removes the only consumers of the year and hostname locals, so delete them to avoid unused-variable lint errors.
- The owner-panel photo upload failure was caused by Debug.todo() stubs in getSiteContent/getSongSource: after upload the invalidated query refetch trapped, so the UI could never confirm the new photo. Implementing the reads fixed the whole flow.
- A pending migration's OldActor must match the shape produced by the preceding migration in the chain, not the current main.mo types. When nested record shapes change, the migration must inline both old and new nested types and transform them (Map.map for the messages map).
- CropAdjust is normalized (zoom scale, offsetX/offsetY as fractions of the frame, rotation degrees); rendering it with translate(offsetX*100%, offsetY*100%) scale(zoom) rotate(deg) on an object-cover img reproduces the framing at any size.
- PhotoUploadField must distinguish a new file (bytes present -> onUploaded) from re-cropping an already-saved photo (bytes null -> onCropSaved), otherwise re-cropping would re-upload empty bytes and wipe the photo.
- Autoplay must be attempted in a useEffect keyed on the resolved song URL; a rejected play() promise is the only reliable signal to arm a tap-to-play prompt, and the 'play' event listener is the single source of truth for isPlaying/hasStarted.
- The backend SiteContent type requires songSource, so any test fixture building a SiteContent literal must include it.
- Because the backend updateMessage replaces the whole record, every edit/reorder must re-send photo and crop; build the MessageInput from the resolved message as the fallback source rather than trusting the local draft alone.
- Re-cropping an already-saved message photo should persist through the dedicated setMessageCrop endpoint, which never includes photo bytes and therefore cannot clear the photo.
- PhotoUploadField's preview crop must key off `previewUrl && pending`, not `previewUrl` alone: after a new upload pending is cleared while previewUrl remains, so the saved crop from the parent is the correct value to show.
