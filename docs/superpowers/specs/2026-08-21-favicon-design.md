# YlTt2025 Favicon Design

## Goal

Replace the default Next.js favicon with a compact brand mark for YlTt2025, a dark photography, short-film, and love-story archive.

## Visual Direction

- Symbol: an original geometric rabbit head with two long ears and minimal facial cutouts, giving the archive a more memorable and personal mascot.
- Background: transparent, so the logo does not render as a black square in browser chrome.
- Foreground: warm white `#F7F7F7` with a fine deep charcoal `#111111` outline for contrast on light and dark surfaces.
- Form: no text, no gradients, no shadows, no photographic detail, and no fine illustration detail that disappears at favicon scale.
- Composition: centered rabbit silhouette with long ears, rounded head, two small eye cutouts, and generous transparent padding.

## Deliverable

- Replace `app/favicon.ico` with a multi-size ICO containing 16x16, 32x32, and 48x48 PNG entries.
- Keep the mark deterministic and vector-derived so all embedded sizes share the same geometry.
- Keep the reusable SVG source at `public/yltt-rabbit.svg`.
- Preserve Next.js's root `app/favicon.ico` convention; no layout metadata change is required.

## Acceptance Criteria

- The ICO parses as a valid icon and exposes all three requested sizes.
- The mark is recognizable as two forms meeting when rendered at 16px, 32px, and 48px.
- The file remains compatible with the existing Next.js 16 app icon convention.
- `npm run typecheck`, `npm run test`, `npm run build`, and `git diff --check` pass after the replacement.
