# Design Brief

## Direction

Blush & Bordeaux — a romantic editorial keepsake: a keepsake-album birthday tribute that reads like luxury stationery, not a greeting card.

## Tone

Refined and soft, with a deep plum-bordeaux voice on warm blush-cream paper — elegant restraint carrying rich, choreographed motion.

## Differentiation

A vertical dotted love-letter timeline with rose-gold heart nodes threading alternating message cards and slightly-rotated polaroids, under an arched hero portrait.

## Color Palette

| Token      | OKLCH           | Role                                   |
| ---------- | --------------- | -------------------------------------- |
| background | 0.965 0.012 38  | warm blush-cream canvas                |
| foreground | 0.255 0.045 350 | deep plum ink for all text             |
| card       | 0.995 0.006 45  | near-white cream message surfaces      |
| primary    | 0.40 0.125 355  | plum-bordeaux — CTAs, headline accents |
| accent     | 0.685 0.098 52  | rose-gold — hearts, nodes, highlights  |
| muted      | 0.93 0.018 35   | soft rose-tinted section bands         |

## Typography

- Display: Fraunces — hero greeting, section headings, sign-off (high-contrast serif, italic for emphasis words)
- Body: General Sans — message text, labels, panel UI
- Scale: hero `text-5xl md:text-7xl font-semibold tracking-tight`, h2 `text-3xl md:text-5xl font-semibold tracking-tight`, label `.label-eyebrow`, body `text-base md:text-lg leading-relaxed`

## Elevation & Depth

Layered paper: flat cream base, `shadow-subtle` on bands, `shadow-elevated` on message cards and polaroids, `shadow-float` on the fixed music control; depth comes from stacked surfaces and soft diffused light, never glow.

## Structural Zones

| Zone           | Background                  | Border                | Notes                                             |
| -------------- | --------------------------- | --------------------- | ------------------------------------------------- |
| Header (fixed) | transparent → `glass-panel` | none                  | fades in on scroll; owner entry link right-aligned |
| Hero           | `bg-gradient-subtle` + grain | —                     | full-screen arched portrait, floating hearts      |
| Messages       | `bg-background`             | —                     | alternate `bg-muted/40` bands; dotted timeline    |
| Sign-off       | `bg-gradient-primary`       | —                     | deep bordeaux closing band, inverted text         |
| Footer         | `bg-muted/40`               | `border-t`            | small print + owner panel link                    |
| Music control  | `glass-panel`               | `border` (frosted)    | fixed bottom-right, always visible                |

## Spacing & Rhythm

Sections breathe at `py-24 md:py-32`; message blocks sit in a `max-w-3xl` column with `gap-16 md:gap-24`; micro-spacing uses 4/8/12px steps and `space-y-4` inside cards.

## Component Patterns

- Buttons: pill (`rounded-full`), `bg-primary text-primary-foreground`, hover lifts to `shadow-elevated` + slight scale; secondary is outline on `card`.
- Cards: `rounded-[var(--radius)] bg-card shadow-elevated` with `p-6 md:p-8`; polaroids are sharp-cornered (4px) with white border and rotation.
- Badges: pill, `bg-secondary text-secondary-foreground` for timeline captions; eyebrow labels use `text-accent` uppercase tracking.

## Motion

- Entrance: `fade-up` staggered via `.animation-delay-*` as sections enter viewport; hero greeting uses typewriter reveal with a blinking caret.
- Hover: `transition-smooth` — cards lift (`-translate-y-1` + `shadow-float`), photos straighten from rotation.
- Decorative: `float-heart` ambient hearts, `confetti-fall` burst on first load, `drift` parallax orbs, `pulse-soft` on the music control, `bounce-cue` scroll indicator.

## Constraints

- Only the bundled Fraunces / General Sans / JetBrains Mono fonts — no CDN or external imports.
- All colors via semantic OKLCH tokens; no hex, `rgb()`, or arbitrary color classes in components.
- Motion must respect `prefers-reduced-motion`; every animation is decorative, never blocking content.
- No countdown timer and no shareable personalized-link surface (out of scope).
- Owner management panel reuses the same tokens; it must never leak into the public experience.

## Signature Detail

The arched hero portrait framed by a hairline rose-gold border, with a dotted timeline of heart nodes descending from it — the page reads as one continuous love letter rather than stacked sections.
